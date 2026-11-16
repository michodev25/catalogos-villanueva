import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudinaryDeliveryUrl, cloudinaryPublicId } from "../../src/lib/server/cloudinary.ts";

test("Cloudinary only resolves managed references and signs both photo sizes", () => {
  const config = "cloudinary://12345:fixture-secret@catalog-tests";
  const id = "d30c1115-b654-4699-bd46-dca509306768";
  const publicId = cloudinaryPublicId(`cloudinary:${id}`);
  assert.equal(publicId, `villanueva/${id}`);
  assert.equal(cloudinaryPublicId(`${id}.webp`), null);
  assert.equal(cloudinaryPublicId("cloudinary:../../sample"), null);

  const full = cloudinaryDeliveryUrl(config, publicId!, false);
  const thumb = cloudinaryDeliveryUrl(config, publicId!, true);
  assert.match(full, /^https:\/\/res\.cloudinary\.com\/catalog-tests\/image\/authenticated\/s--[\w-]+--\//);
  assert.match(new URL(full).pathname, /\/villanueva\/[\w-]+\.webp$/);
  assert.doesNotMatch(full, /w_480/);
  assert.match(thumb, /\/c_limit,q_auto:good,w_480\//);
  assert.doesNotMatch(full + thumb, /fixture-secret|12345/);
});
