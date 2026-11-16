export const browserArgs = ['--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND'];
export async function offline(context, problems) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (/^https?:$/.test(url.protocol)) {
      problems.push('Unexpected external request: ' + url.origin);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}
