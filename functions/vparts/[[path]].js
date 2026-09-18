// The video parts live in /public/vparts as static files. This route sits in front
// of that folder and refuses every direct request. Only /api/video can read the parts,
// through the internal ASSETS binding, after it has checked the viewer's cookie.
export function onRequest() {
  return new Response("Not found", { status: 404 });
}
