import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { cloudinaryDeliveryUrl, cloudinaryPublicId } from "../../src/lib/server/cloudinary.ts";

test("Cloudinary only resolves managed references and signs both photo sizes", async () => {
  const config = "cloudinary://12345:fixture-secret@catalog-tests";
  const id = "d30c1115-b654-4699-bd46-dca509306768";
  const publicId = cloudinaryPublicId(`cloudinary:${id}`);
  assert.equal(publicId, `villanueva/${id}`);
  assert.equal(cloudinaryPublicId(`${id}.webp`), null);
  assert.equal(cloudinaryPublicId("cloudinary:../../sample"), null);

  const full = await cloudinaryDeliveryUrl(config, publicId!, false);
  const thumb = await cloudinaryDeliveryUrl(config, publicId!, true);
  assert.match(full, /^https:\/\/res\.cloudinary\.com\/catalog-tests\/image\/authenticated\/s--[\w-]+--\//);
  assert.match(new URL(full).pathname, /\/villanueva\/[\w-]+\.webp$/);
  assert.doesNotMatch(full, /w_480/);
  assert.match(thumb, /\/c_limit,q_auto:good,w_480\//);
  assert.doesNotMatch(full + thumb, /fixture-secret|12345/);
});

test("an invalid Cloudinary setting does not prevent routes from loading", () => {
  const moduleUrl = new URL("../../src/lib/server/cloudinary.ts", import.meta.url).href;
  const script = `
    const { cloudinaryPublicId, cloudinaryDeliveryUrl } = await import(process.argv[1]);
    if (cloudinaryPublicId("existing.webp") !== null) process.exit(1);
    try {
      await cloudinaryDeliveryUrl(process.env.CLOUDINARY_URL, "unused", false);
      process.exit(2);
    } catch (error) {
      if (error.message !== "Configura CLOUDINARY_URL en el servidor para conectar las fotos.")
        throw error;
    }
  `;
  const check = spawnSync(process.execPath, ["--input-type=module", "-e", script, moduleUrl], {
    env: { ...process.env, CLOUDINARY_URL: "CLOUDINARY_URL=cloudinary://12345:fixture-secret@catalog-tests" },
    encoding: "utf8",
  });
  assert.equal(check.status, 0, check.stderr);
});
