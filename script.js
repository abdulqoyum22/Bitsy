const pairAddress = "5hWp9c53Vh3NnNLxg1DiEE9GmcgwphPBecgHdvN8webq";

// Load token data from DexScreener
async function loadTokenData() {
    try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`);
        const data = await res.json();
        const pair = data.pairs[0];

        if (pair) {
            document.getElementById("price").textContent = "$" + Number(pair.priceUsd).toFixed(6);
            document.getElementById("liquidity").textContent = "$" + Math.round(pair.liquidity.usd).toLocaleString();
            document.getElementById("mc").textContent = "$" + Math.round(pair.fdv).toLocaleString();
            document.getElementById("vol").textContent = "$" + Math.round(pair.volume.h24).toLocaleString();
        }
    } catch (err) {
        console.log("Error loading token data:", err);
    }
}

// Load on page load and refresh every 10 seconds
loadTokenData();
setInterval(loadTokenData, 10000);

// Gallery visibility toggle
const btn = document.getElementById("seeMoreBtn");
const extra = document.getElementById("extraRow");

if (btn && extra) {
    btn.addEventListener("click", () => {
        extra.classList.remove("hidden");
        btn.style.display = "none";
    });
}

// Copy to clipboard functionality
const copyBtn = document.getElementById("copyBtn");
if (copyBtn) {
    copyBtn.addEventListener("click", () => {
        const address = document.getElementById("contractAddress").textContent.trim();
        navigator.clipboard.writeText(address).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "COPIED ✓";
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(() => {
            alert("Failed to copy address");
        });
    });
}

// Smooth scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements with animation classes
document.querySelectorAll('.opacity-0').forEach(el => {
    observer.observe(el);
});

// ─────────────────────────────────────────
// PFP GENERATOR
// ─────────────────────────────────────────

let selectedStyle = 'anime';
let uploadedImageBase64 = null;

function handlePFPUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const preview = document.getElementById('uploadPreview');
  const placeholder = document.getElementById('uploadPlaceholder');
  const reader = new FileReader();
  reader.onload = function(e) {
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    uploadedImageBase64 = e.target.result.split(',')[1];
  };
  reader.readAsDataURL(file);
}

function selectStyle(style, btn) {
  selectedStyle = style;
  document.querySelectorAll('.style-btn').forEach(function(b) {
    b.classList.remove('border-primary', 'bg-cream', 'text-text-dark');
    b.classList.add('border-black/10', 'text-text-soft');
  });
  btn.classList.add('border-primary', 'bg-cream', 'text-text-dark');
  btn.classList.remove('border-black/10', 'text-text-soft');
}

async function generatePFP() {
  if (!uploadedImageBase64) { showPFPError('Please upload a photo first!'); return; }
  const btn = document.getElementById('pfpGenerateBtn');
  const errorEl = document.getElementById('pfpError');
  const resultEl = document.getElementById('pfpResult');
  errorEl.classList.add('hidden');
  resultEl.classList.add('hidden');
  btn.textContent = '⏳ Generating... please wait';
  btn.disabled = true;

  try {
    const res = await fetch('/api/generate-pfp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: uploadedImageBase64,
        style: selectedStyle,
        extra_prompt: document.getElementById('pfpCustomPrompt').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    document.getElementById('pfpOutput').src = 'data:image/png;base64,' + data.image;
    resultEl.classList.remove('hidden');
    resultEl.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showPFPError(err.message);
  }

  btn.textContent = '✦ Generate PFP';
  btn.disabled = false;
}

function downloadPFP() {
  const a = document.createElement('a');
  a.href = document.getElementById('pfpOutput').src;
  a.download = 'bitsy-pfp.png';
  a.click();
}

function showPFPError(msg) {
  const el = document.getElementById('pfpError');
  el.textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
}

