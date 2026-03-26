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

