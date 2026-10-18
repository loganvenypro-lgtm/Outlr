/**
 * Autonomous Background Cron Worker
 * Runs every 30 minutes to fetch live, ultra-fresh YouTube RSS data,
 * calculate real-time outlier multipliers, and alert Discord.
 */

const INTERVAL_MINUTES = 10;
const API_URL = "http://localhost:3000/api/pipeline/sync-outliers?limit=60&maxDays=7&minMultiplier=2.0";

async function runScan() {
  const timestamp = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`\n[${timestamp}] 🚀 [CRON] Début du scan YouTube en direct...`);

  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      console.error(`[${timestamp}] ❌ Erreur HTTP ${res.status}:`, await res.text());
      return;
    }

    const data = await res.json();
    console.log(`[${timestamp}] ✅ [CRON SUCCÈS] Bilan du cycle :`, {
      chaînesScannées: data.summary?.channelsScanned,
      vidéosYouTubeIngérées: data.summary?.totalRssVideosIngested,
      outliersIndexés: data.summary?.outliersIndexed,
      nouvellesAlertesDiscord: data.summary?.newOutliersAlertedToDiscord,
      statutDiscord: data.summary?.discordStatus,
    });

    if (data.alertsSent && data.alertsSent.length > 0) {
      console.log(`[${timestamp}] 🔔 Pépites alertées sur Discord :`);
      for (const a of data.alertsSent) {
        console.log(`   - [${a.multiplier}] "${a.title}" (${a.views.toLocaleString()} vues) • Chaîne: ${a.channel}`);
      }
    }
  } catch (err) {
    console.error(`[${timestamp}] ❌ Exception lors du scan :`, err.message);
  }
}

console.log("==========================================================");
console.log("   YouTube Outlier Radar Worker (Cycle : Toutes les 30 min)");
console.log("   Zero-Quota • RSS temps réel • Discord Embeds");
console.log("==========================================================");

// Exécution immédiate au démarrage
runScan();

// Planification récurrente toutes les 30 minutes
setInterval(runScan, INTERVAL_MINUTES * 60 * 1000);
