async function test() {
  const url = "https://www.youtube.com/watch?v=dSRjS6xsQVQ";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
  const html = await res.text();
  
  const isShortRegex = /"isShort":true|reelWatchEndpoint/i;
  const durMatch = html.match(/"lengthSeconds":"(\d+)"/);
  const dur = durMatch ? parseInt(durMatch[1], 10) : 0;
  const isShort = (dur > 0 && dur <= 60) || isShortRegex.test(html);

  console.log({
    id: "dSRjS6xsQVQ",
    durationSeconds: dur,
    isShort,
  });
}
test();
