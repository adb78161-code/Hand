// @ts-nocheck

// ============================================================
// HANDCAPTION V2
// Android-first handwriting creator
// ============================================================

// Required characters:
// 26 uppercase + 26 lowercase + 10 digits = 62
const uppercaseChars = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const lowercaseChars = [..."abcdefghijklmnopqrstuvwxyz"];
const digitChars = [..."0123456789"];

const requiredChars = [
  ...uppercaseChars,
  ...lowercaseChars,
  ...digitChars
];

const uppercaseGrid = document.getElementById("uppercaseGrid");
const lowercaseGrid = document.getElementById("lowercaseGrid");
const digitsGrid = document.getElementById("digitsGrid");

const packName = document.getElementById("packName");
const savePackButton = document.getElementById("savePack");
const clearPackButton = document.getElementById("clearPack");

const progressText = document.getElementById("progressText");
const progressMessage = document.getElementById("progressMessage");
const progressBar = document.getElementById("progressBar");

const mediaSection = document.getElementById("mediaSection");
const lockedMessage = document.getElementById("lockedMessage");
const uploadButton = document.getElementById("uploadButton");
const mediaInput = document.getElementById("mediaInput");

const savedPacks = document.getElementById("savedPacks");

const canvases = new Map();


// ============================================================
// CREATE CHARACTER BOX
// ============================================================

function makeCharacterCard(character, parent) {

    const card = document.createElement("div");
    card.className = "char-card";

    const title = document.createElement("div");
    title.className = "char-title";
    title.textContent = character;

    const canvas = document.createElement("canvas");

    canvas.className = "char-canvas";
    canvas.width = 180;
    canvas.height = 90;

    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#111";

    let drawing = false;


    function position(event) {

        const rect = canvas.getBoundingClientRect();

        return {
            x:
                (event.clientX - rect.left) *
                canvas.width /
                rect.width,

            y:
                (event.clientY - rect.top) *
                canvas.height /
                rect.height
        };
    }


    // -------------------------------
    // START DRAWING
    // -------------------------------

    canvas.addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            drawing = true;

            try {
                canvas.setPointerCapture(event.pointerId);
            } catch (_) {}

            const point = position(event);

            ctx.beginPath();

            ctx.moveTo(
                point.x,
                point.y
            );

        },
        { passive: false }
    );


    // -------------------------------
    // DRAW
    // -------------------------------

    canvas.addEventListener(
        "pointermove",
        function(event) {

            if (!drawing) return;

            event.preventDefault();

            const point = position(event);

            ctx.lineTo(
                point.x,
                point.y
            );

            ctx.stroke();

            updateCharacterStatus(character);

        },
        { passive: false }
    );


    // -------------------------------
    // STOP
    // -------------------------------

    function stopDrawing(event) {

        drawing = false;

        try {
            canvas.releasePointerCapture(
                event.pointerId
            );
        } catch (_) {}

        updateCharacterStatus(character);
        updateProgress();
    }


    canvas.addEventListener(
        "pointerup",
        stopDrawing
    );

    canvas.addEventListener(
        "pointercancel",
        stopDrawing
    );


    // -------------------------------
    // ERASE / REWRITE ONE CHARACTER
    // -------------------------------

    const actions = document.createElement("div");
    actions.className = "char-actions";

    const eraseButton = document.createElement("button");

    eraseButton.className = "ghost";
    eraseButton.textContent = "Erase & rewrite";

    eraseButton.addEventListener(
        "click",
        function() {

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            updateCharacterStatus(character);
            updateProgress();

            // Put focus back on the character canvas
            canvas.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

        }
    );


    actions.appendChild(eraseButton);


    card.appendChild(title);
    card.appendChild(canvas);
    card.appendChild(actions);


    const status = document.createElement("div");

    status.className = "completed-label";
    status.textContent = "";

    card.appendChild(status);


    parent.appendChild(card);


    canvases.set(character, {
        canvas: canvas,
        card: card,
        status: status
    });
}


// ============================================================
// CREATE ALL 62 CHARACTER BOXES
// ============================================================

uppercaseChars.forEach(
    char => makeCharacterCard(char, uppercaseGrid)
);

lowercaseChars.forEach(
    char => makeCharacterCard(char, lowercaseGrid)
);

digitChars.forEach(
    char => makeCharacterCard(char, digitsGrid)
);


// ============================================================
// CHECK WHETHER CHARACTER IS EMPTY
// ============================================================

function isBlank(canvas) {

    const ctx = canvas.getContext(
        "2d",
        { willReadFrequently: true }
    );

    const data = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    ).data;


    for (
        let i = 3;
        i < data.length;
        i += 4
    ) {

        if (data[i] > 0) {
            return false;
        }

    }

    return true;
}


// ============================================================
// CHARACTER STATUS
// ============================================================

function updateCharacterStatus(character) {

    const item =
        canvases.get(character);

    if (!item) return;


    const completed =
        !isBlank(item.canvas);


    item.card.classList.toggle(
        "completed",
        completed
    );


    item.status.textContent =
        completed
            ? "✓ Written"
            : "";

}


// ============================================================
// PROGRESS
// ============================================================

function getCompletedCount() {

    let count = 0;

    canvases.forEach(
        function(item) {

            if (!isBlank(item.canvas)) {
                count++;
            }

        }
    );

    return count;
}


function updateProgress() {

    const completed =
        getCompletedCount();

    const total =
        requiredChars.length;

    const percentage =
        Math.round(
            completed / total * 100
        );


    progressText.textContent =
        `${completed} / ${total} completed`;


    progressBar.style.width =
        percentage + "%";


    if (completed === total) {

        progressMessage.textContent =
            "✓ All characters completed. You can save your handwriting.";

        progressMessage.style.color =
            "#16834a";

        savePackButton.disabled = false;

    } else {

        const remaining =
            total - completed;

        progressMessage.textContent =
            `${remaining} character${remaining === 1 ? "" : "s"} remaining.`;

        progressMessage.style.color =
            "";

        savePackButton.disabled = true;

    }

}


// ============================================================
// LOCAL STORAGE
// ============================================================

function loadPacks() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "handcaption_packs"
            ) || "[]"
        );

    } catch (error) {

        console.error(error);

        return [];

    }

}


function savePacks(packs) {

    try {

        localStorage.setItem(
            "handcaption_packs",
            JSON.stringify(packs)
        );

        return true;

    } catch (error) {

        alert(
            "Could not save the handwriting pack. " +
            "Your browser storage may be full."
        );

        return false;

    }

}


// ============================================================
// RENDER SAVED PACKS
// ============================================================

function renderSavedPacks() {

    const packs =
        loadPacks();


    savedPacks.innerHTML = "";


    if (packs.length === 0) {

        savedPacks.innerHTML =
            '<div class="hint">No handwriting pack saved yet.</div>';

        return;

    }


    packs.forEach(
        function(pack) {

            const pill =
                document.createElement("div");

            pill.className =
                "pack-pill";

            pill.textContent =
                "✍️ " + pack.name;

            savedPacks.appendChild(
                pill
            );

        }
    );

}


// ============================================================
// SAVE HANDWRITING
// ============================================================

savePackButton.addEventListener(
    "click",
    function() {

        // Extra safety check
        const completed =
            getCompletedCount();


        if (
            completed !==
            requiredChars.length
        ) {

            alert(
                "You must complete all 62 characters first."
            );

            return;

        }


        const glyphs = {};


        canvases.forEach(
            function(item, character) {

                glyphs[character] =
                    item.canvas.toDataURL(
                        "image/png"
                    );

            }
        );


        const name =
            packName.value.trim() ||
            "My Handwriting";


        const packs =
            loadPacks();


        packs.push({

            name: name,

            glyphs: glyphs,

            characterCount:
                requiredChars.length,

            created:
                Date.now()

        });


        if (
            savePacks(packs)
        ) {

            renderSavedPacks();

            unlockMedia();


            alert(
                "✓ Your handwriting has been saved!"
            );

        }

    }
);


// ============================================================
// CLEAR ALL
// ============================================================

clearPackButton.addEventListener(
    "click",
    function() {

        const confirmed =
            confirm(
                "Erase all 62 characters and start again?"
            );


        if (!confirmed) return;


        canvases.forEach(
            function(item) {

                const ctx =
                    item.canvas.getContext("2d");

                ctx.clearRect(
                    0,
                    0,
                    item.canvas.width,
                    item.canvas.height
                );

            }
        );


        updateProgress();

        lockMedia();

    }
);


// ============================================================
// MEDIA LOCK / UNLOCK
// ============================================================

function unlockMedia() {

    mediaSection.classList.remove(
        "locked"
    );

    lockedMessage.classList.add(
        "hidden"
    );

    uploadButton.classList.remove(
        "disabled"
    );

    mediaInput.disabled = false;

}


function lockMedia() {

    mediaSection.classList.add(
        "locked"
    );

    lockedMessage.classList.remove(
        "hidden"
    );

    uploadButton.classList.add(
        "disabled"
    );

    mediaInput.disabled = true;

}


// ============================================================
// CHECK IF A COMPLETE PACK ALREADY EXISTS
// ============================================================

function hasCompleteSavedPack() {

    const packs =
        loadPacks();


    return packs.some(
        function(pack) {

            return (
                pack.characterCount ===
                requiredChars.length &&
                Object.keys(
                    pack.glyphs || {}
                ).length ===
                requiredChars.length
            );

        }
    );

}


// ============================================================
// INITIAL STATE
// ============================================================

updateProgress();

renderSavedPacks();


// Even if an old pack exists, the current session
// must complete the handwriting step before upload.
lockMedia();


// ============================================================
// NOTE:
// The photo/video editor will be connected after
// the handwriting step is successfully completed.
// ============================================================
                
