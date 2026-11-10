import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { sha256 } from "../supabase/functions/_shared/domain/evaluation.js";
import { complete, evidence, ACTOR, OTHER, ADMIN } from "./fixtures.js";

test("migraciones, roles, RLS, concurrencia, cierre y trazabilidad en PostgreSQL aislado", async (t) => {
  const db = new PGlite();
  await db.exec(
    `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}'); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role; GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;`,
  );
  try {
    await db.exec(
      fs.readFileSync("supabase/sql/00_revision_previa.sql", "utf8"),
    );
    for (const file of fs
      .readdirSync("supabase/migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(fs.readFileSync("supabase/migrations/" + file, "utf8"));
    await t.test(
      "la comprobacion de instalacion SQL valida las tablas y los permisos nuevos",
      async () => {
        await db.exec(
          fs.readFileSync("supabase/sql/02_verificar_v2.sql", "utf8"),
        );
      },
    );
    await db.query(
      "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES($1,$2,$3),($4,$5,$6),($7,$8,$9)",
      [
        ACTOR,
        "a@invalid.test",
        { nombre: "A", rol: "admin" },
        OTHER,
        "b@invalid.test",
        { nombre: "B" },
        ADMIN,
        "admin@invalid.test",
        { nombre: "Admin" },
      ],
    );
    await db.query("UPDATE public.perfiles SET rol='admin' WHERE id=$1", [
      ADMIN,
    ]);
    const role = async (name, id) => {
      await db.exec("RESET ROLE");
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("SET ROLE " + name);
    };
    await t.test(
      "el trigger ignora rol administrativo enviado por el usuario",
      async () =>
        assert.equal(
          (
            await db.query("SELECT rol FROM public.perfiles WHERE id=$1", [
              ACTOR,
            ])
          ).rows[0].rol,
          "evaluador",
        ),
    );
    await role("authenticated", ACTOR);
    await t.test(
      "el navegador no puede cambiar roles ni llamar operaciones de servicio",
      async () => {
        await assert.rejects(
          db.query("UPDATE public.perfiles SET rol='admin' WHERE id=$1", [
            ACTOR,
          ]),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          db.query("SELECT public.siga_write(NULL,$1,0,$2,false)", [
            ACTOR,
            complete(),
          ]),
          (e) => e.code === "42501",
        );
        assert.equal(
          (await db.query("SELECT count(*)::int n FROM public.perfiles"))
            .rows[0].n,
          1,
        );
      },
    );
    await role("service_role", ACTOR);
    // Una llamada compuesta se evalúa una sola vez mediante FROM; evita múltiples inserciones por expansión de atributos.
    const created = (
        await db.query("SELECT * FROM public.siga_write(NULL,$1,0,$2,false)", [
          ACTOR,
          complete(),
        ])
      ).rows[0],
      id = created.id;
    await t.test(
      "un actor ajeno es rechazado incluso dentro de la operación de servidor",
      async () =>
        await assert.rejects(
          db.query("SELECT * FROM public.siga_write($1,$2,0,$3,false)", [
            id,
            OTHER,
            complete(),
          ]),
          (e) => e.code === "42501",
        ),
    );
    await t.test(
      "revisión antigua no sobrescribe una actualización reciente",
      async () => {
        const first = (
          await db.query("SELECT * FROM public.siga_write($1,$2,0,$3,false)", [
            id,
            ACTOR,
            complete(),
          ])
        ).rows[0];
        assert.equal(first.revision, 1);
        await assert.rejects(
          db.query("SELECT * FROM public.siga_write($1,$2,0,$3,false)", [
            id,
            ACTOR,
            complete(),
          ]),
          (e) => e.code === "40001",
        );
      },
    );
    await t.test(
      "cerrar sin evidencias falla",
      async () =>
        await assert.rejects(
          db.query("SELECT * FROM public.siga_write($1,$2,1,$3,true)", [
            id,
            ACTOR,
            complete(),
          ]),
          /foto o un video/,
        ),
    );
    const media = [];
    for (const ev of evidence()) {
      const data = {
        ...ev,
        public_id: "test_" + ev.id,
        formato: ev.tipo === "imagen" ? "jpg" : "mp4",
        nombre_archivo: "prueba",
        tamano_bytes: 100,
      };
      const row = (
        await db.query("SELECT * FROM public.siga_reserve_media($1,$2,$3,$4)", [
          id,
          ACTOR,
          ev.id,
          data,
        ])
      ).rows[0];
      await db.query(
        "SELECT * FROM public.siga_activate_media($1,$2,$3,100,100)",
        [
          row.id,
          ACTOR,
          "https://res.cloudinary.com/demo/image/authenticated/test.jpg",
        ],
      );
      media.push(row);
    }
    await t.test("cierre válido conserva informe, hash y versión", async () => {
      const payload = (
        await db.query("SELECT payload FROM public.evaluaciones WHERE id=$1", [
          id,
        ])
      ).rows[0].payload;
      await db.query("SELECT * FROM public.siga_write($1,$2,1,$3,true)", [
        id,
        ACTOR,
        payload,
      ]);
      const report = (
        await db.query("SELECT * FROM public.informes WHERE evaluacion_id=$1", [
          id,
        ])
      ).rows[0];
      assert.equal(await sha256(report.contenido_canonico), report.sha256);
      assert.equal(report.snapshot.revision, 2);
      assert.equal(report.snapshot.payload.versions.rula, "RULA-1993-v2");
      assert.equal(report.snapshot.evidencias.length, 2);
    });
    await t.test(
      "no se pueden modificar informe ni evidencia después del cierre",
      async () => {
        await assert.rejects(
          db.query(
            "UPDATE public.informes SET snapshot='{}' WHERE evaluacion_id=$1",
            [id],
          ),
          /inmutable/,
        );
        await assert.rejects(
          db.query("UPDATE public.evaluaciones SET empresa=$2 WHERE id=$1", [
            id,
            "Manipulada",
          ]),
          /cerrado/,
        );
        await assert.rejects(
          db.query("DELETE FROM public.evidencias WHERE id=$1", [media[0].id]),
          /cerradas/,
        );
        await assert.rejects(
          db.query(
            "UPDATE public.auditoria SET detalle='{}' WHERE evaluacion_id=$1",
            [id],
          ),
          /inmutable/,
        );
      },
    );
    await t.test(
      "seguimiento posterior queda auditado sin alterar informe",
      async () => {
        const action = (
            await db.query(
              "SELECT * FROM public.acciones_control WHERE evaluacion_id=$1",
              [id],
            )
          ).rows[0],
          hash = (
            await db.query(
              "SELECT sha256 FROM public.informes WHERE evaluacion_id=$1",
              [id],
            )
          ).rows[0].sha256;
        await db.query("SELECT * FROM public.siga_track_control($1,$2,$3,$4)", [
          action.id,
          ACTOR,
          "verificada",
          "Altura corregida y revisada en campo",
        ]);
        assert.equal(
          (
            await db.query(
              "SELECT sha256 FROM public.informes WHERE evaluacion_id=$1",
              [id],
            )
          ).rows[0].sha256,
          hash,
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int n FROM public.auditoria WHERE accion='seguimiento_control' AND actor_id=$1",
              [ACTOR],
            )
          ).rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "reservas cuentan para el cupo y la eliminación conserva trabajo hasta confirmación",
      async () => {
        const parent = (
          await db.query(
            "SELECT * FROM public.siga_write(NULL,$1,0,$2,false)",
            [ACTOR, complete()],
          )
        ).rows[0];
        const reserve = async () => {
          const mediaId = crypto.randomUUID();
          return (
            await db.query(
              "SELECT * FROM public.siga_reserve_media($1,$2,$3,$4)",
              [
                parent.id,
                ACTOR,
                mediaId,
                {
                  ...evidence()[1],
                  public_id: "quota_" + mediaId,
                  formato: "mp4",
                  nombre_archivo: "prueba.mp4",
                  tamano_bytes: 100,
                },
              ],
            )
          ).rows[0];
        };
        const rows = [];
        for (let n = 0; n < 3; n++) rows.push(await reserve());
        await assert.rejects(reserve(), /Limite/);
        await assert.rejects(
          db.query("SELECT public.siga_queue_delete($1,$2,0)", [
            rows[0].id,
            OTHER,
          ]),
          (e) => e.code === "42501",
        );
        const job = (
          await db.query("SELECT public.siga_queue_delete($1,$2,0) AS id", [
            rows[0].id,
            ACTOR,
          ])
        ).rows[0].id;
        assert.equal(
          (
            await db.query("SELECT estado FROM public.evidencias WHERE id=$1", [
              rows[0].id,
            ])
          ).rows[0].estado,
          "eliminando",
        );
        assert.equal(
          (
            await db.query("SELECT estado FROM public.asset_jobs WHERE id=$1", [
              job,
            ])
          ).rows[0].estado,
          "pendiente",
        );
        await db.query("SELECT public.siga_finish_delete($1)", [job]);
        await db.query("SELECT public.siga_finish_delete($1)", [job]);
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int n FROM public.evidencias WHERE id=$1",
              [rows[0].id],
            )
          ).rows[0].n,
          0,
        );
        assert.equal(
          (
            await db.query("SELECT estado FROM public.asset_jobs WHERE id=$1", [
              job,
            ])
          ).rows[0].estado,
          "completada",
        );
      },
    );
    await role("anon", "");
    await t.test(
      "sin sesión no se leen expedientes ni se ejecutan escrituras",
      async () => {
        for (const table of [
          "perfiles",
          "evaluaciones",
          "evidencias",
          "informes",
          "auditoria",
          "acciones_control",
          "asset_jobs",
        ])
          await assert.rejects(
            db.query("SELECT * FROM public." + table),
            (e) => e.code === "42501",
          );
        await assert.rejects(
          db.query("SELECT * FROM public.siga_write(NULL,$1,0,$2,false)", [
            ACTOR,
            complete(),
          ]),
          (e) => e.code === "42501",
        );
      },
    );
    await role("authenticated", OTHER);
    await t.test(
      "otro evaluador no puede leer evaluación, informe ni auditoría",
      async () => {
        for (const table of ["evaluaciones", "informes", "auditoria"])
          assert.equal(
            (await db.query("SELECT count(*)::int n FROM public." + table))
              .rows[0].n,
            0,
          );
      },
    );
    await role("authenticated", ADMIN);
    await t.test(
      "el administrador puede leer el expediente sin permiso de edición directa",
      async () => {
        assert.ok(
          (await db.query("SELECT count(*)::int n FROM public.evaluaciones"))
            .rows[0].n > 0,
        );
        await assert.rejects(
          db.query("UPDATE public.evaluaciones SET empresa=$1", [
            "Cambio directo",
          ]),
          (e) => e.code === "42501",
        );
      },
    );
    await db.exec("RESET ROLE");
    await t.test(
      "el administrador inicial exige un correo explicito y registra la asignacion una sola vez",
      async () => {
        const script = fs.readFileSync(
          "supabase/sql/03_administrador_inicial.sql",
          "utf8",
        );
        await assert.rejects(db.exec(script), /Sustituye/);
        await db.exec("ROLLBACK");
        const prepared = script.replace(
          "correo_admin text := 'ADMIN_EMAIL_REEMPLAZAR'",
          "correo_admin text := 'b@invalid.test'",
        );
        await db.exec(prepared);
        await db.exec(prepared);
        assert.equal(
          (
            await db.query("SELECT rol FROM public.perfiles WHERE id=$1", [
              OTHER,
            ])
          ).rows[0].rol,
          "admin",
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int n FROM public.auditoria WHERE accion='asignacion_admin_manual'",
            )
          ).rows[0].n,
          1,
        );
      },
    );
  } finally {
    await db.close();
  }
});
