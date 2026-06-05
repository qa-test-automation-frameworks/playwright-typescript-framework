const port = process.env.TARGET_PORT || 4300;
fetch(`http://127.0.0.1:${port}/api/reset`, { method: 'POST' })
  .then((res) => {
    if (!res.ok) throw new Error(`Target seed failed with ${res.status}`);
    return res.json();
  })
  .then((body) => process.stdout.write(`${JSON.stringify(body)}\n`));
