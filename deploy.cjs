// scripts/deploy.js
const { execSync } = require("child_process");
const fs = require("fs");

const DIST_DIR = "build";
const BRANCH = "build";
const REPO = "git@github.com:Aytirix/HelpTranscendence.git";
const TMP_DIR = ".gh-temp";

try {
  console.log("🔄 Déploiement en cours...");

  if (!fs.existsSync(DIST_DIR)) {
    throw new Error("Le dossier de build n'existe pas. Lancez vite build d'abord.");
  }

  execSync(`rm -rf ${TMP_DIR}`);
  execSync(`git clone --branch ${BRANCH} --depth=1 ${REPO} ${TMP_DIR}`);
  execSync(`rm -rf ${TMP_DIR}/*`);
  execSync(`cp -r ${DIST_DIR}/* ${TMP_DIR}/`);

  process.chdir(TMP_DIR);
  execSync("git add .");
  execSync(`git commit -m "Déploiement auto - ${(new Date()).toISOString()}" || true`);
  execSync(`git push origin ${BRANCH}`);
  process.chdir("..");
  execSync(`rm -rf ${TMP_DIR}`);

  console.log("✅ Déployé avec succès !");
} catch (err) {
  console.error("❌ Erreur de déploiement :", err.message);
  process.exit(1);
}
