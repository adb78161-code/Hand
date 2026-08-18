// ============================================================
// HANDCAPTION - ANDROID FRIENDLY VERSION
// ============================================================
// @ts-nocheck

const chars = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?'-:;()&@#%+*/=<>_♡♥"];
const chars = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?'-:;()&@#%+*/=<>_♡♥"];

const grid = document.getElementById("characterGrid");
const packName = document.getElementById("packName");
const savedPacks = document.getElementById("savedPacks");
const packSelect = document.getElementById("packSelect");

const canvases = new Map();
const imageCache = new Map();

// ============================================================
// CHARACTER DRAWING
// ============================================================

function makeCharCard(ch) {

    const card = document.createElement("div");
    card.className = "char-card";

    const title = document.createElement("div");
    title.className = "char-title";
    title.textContent = ch === " " ? "space" : ch;

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

    function getPosition(e) {

        const rect = canvas.getBoundingClientRect();

        return {
            x: (e.clientX - rect.left) *
                (canvas.width / rect.width),

            y: (e.clientY - rect.top) *
                (canvas.height / rect.height)
        };
    }

    // -------------------------------
    // TOUCH / PEN / MOUSE
    // -------------------------------

    canvas.addEventListener("pointerdown", function (e) {

        e.preventDefault();

        drawing = true;

        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (_) {}

        const p = getPosition(e);

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);

    }, { passive: false });


    canvas.addEventListener("pointermove", function (e) {

        if (!drawing) return;

        e.preventDefault();

        const p = getPosition(e);

        ctx.lineTo(p.x, p.y);
        ctx.stroke();

    }, { passive: false });


    function stopDrawing(e) {

        drawing = false;

        try {
            if (e.pointerId !== undefined) {
                canvas.releasePointerCapture(e.pointerId);
            }
        } catch (_) {}
    }

    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", function () {
        // Don't stop drawing here.
        // Android finger movement can temporarily leave the element.
    });


    // -------------------------------
    // REDRAW BUTTON
    // -------------------------------

    const actions = document.createElement("div");
    actions.className = "char-actions";

    const clearButton = document.createElement("button");

    clearButton.className = "ghost";
    clearButton.textContent = "Redraw";

    clearButton.addEventListener("click", function () {

        ctx.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

    });

    actions.appendChild(clearButton);

    card.appendChild(title);
    card.appendChild(canvas);
    card.appendChild(actions);

    grid.appendChild(card);

    canvases.set(ch, canvas);
}


// Create all character boxes
chars.forEach(makeCharCard);


// ============================================================
// STORAGE
// ============================================================

function dataURL(canvas) {
    return canvas.toDataURL("image/png");
}


function loadPacks() {

    try {

        return JSON.parse(
            localStorage.getItem("handcaption_packs") || "[]"
        );

    } catch (error) {

        console.error("Could not load packs:", error);

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

        console.error(error);

        alert(
            "Android browser storage is full. " +
            "Please delete an old handwriting pack."
        );

        return false;
    }
}


// ============================================================
// CHECK CANVAS
// ============================================================

function isBlank(canvas) {

    const ctx = canvas.getContext("2d", {
        willReadFrequently: true
    });

    const data = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
    ).data;

    for (let i = 3; i < data.length; i += 4) {

        if (data[i] > 0) {
            return false;
        }

    }

    return true;
}


// ============================================================
// PACK DISPLAY
// ============================================================

function renderPacks() {

    const packs = loadPacks();

    savedPacks.innerHTML = "";
    packSelect.innerHTML = "";

    if (packs.length === 0) {

        savedPacks.innerHTML =
            '<div class="hint">No saved packs yet.</div>';

        return;
    }

    packs.forEach(function (pack, index) {

        const option = document.createElement("option");

        option.value = index;
        option.textContent = pack.name;

        packSelect.appendChild(option);


        const pill = document.createElement("div");

        pill.className = "pack-pill";

        pill.textContent = "✍️ " + pack.name;

        savedPacks.appendChild(pill);

    });
}


// ============================================================
// SAVE HANDWRITING PACK
// ============================================================

document.getElementById("savePack").addEventListener(
    "click",
    function () {

        const glyphs = {};

        canvases.forEach(function (canvas, character) {

            if (!isBlank(canvas)) {

                glyphs[character] = dataURL(canvas);

            }

        });


        if (Object.keys(glyphs).length === 0) {

            alert(
                "Please write at least one character first."
            );

            return;
        }


        const name =
            packName.value.trim() ||
            "My Handwriting";


        const packs = loadPacks();

        packs.push({

            name: name,

            glyphs: glyphs,

            created: Date.now()

        });


        if (savePacks(packs)) {

            renderPacks();

            alert(
                "Handwriting pack saved successfully!"
            );

        }

    }
);


// ============================================================
// CLEAR ALL CHARACTER BOXES
// ============================================================

document.getElementById("clearPack").addEventListener(
    "click",
    function () {

        if (
            !confirm(
                "Clear all handwriting characters?"
            )
        ) {
            return;
        }

        canvases.forEach(function (canvas) {

            canvas
                .getContext("2d")
                .clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

        });

    }
);


renderPacks();


// ============================================================
// PHOTO EDITOR
// ============================================================

const imageInput =
    document.getElementById("imageInput");

const editorWrap =
    document.getElementById("editorWrap");

const editor =
    document.getElementById("editorCanvas");

const ectx =
    editor.getContext("2d");


let baseImage = null;

let textLayer = null;

let dragging = false;

let dragOffset = {
    x: 0,
    y: 0
};


// ============================================================
// UPLOAD PHOTO
// ============================================================

imageInput.addEventListener(
    "change",
    function (event) {

        const file =
            event.target.files &&
            event.target.files[0];

        if (!file) return;


        if (!file.type.startsWith("image/")) {

            alert("Please select an image.");

            return;
        }


        const image = new Image();

        image.onload = function () {

            baseImage = image;

            fitEditor();

            editorWrap.classList.remove(
                "hidden"
            );

        };


        image.onerror = function () {

            alert(
                "Android could not open this image."
            );

        };


        image.src =
            URL.createObjectURL(file);

    }
);


// ============================================================
// FIT IMAGE TO EDITOR
// ============================================================

function fitEditor() {

    if (!baseImage) return;


    const maxWidth = 1000;

    const maxHeight = 700;


    const scale =
        Math.min(
            maxWidth / baseImage.width,
            maxHeight / baseImage.height,
            1
        );


    editor.width =
        Math.round(
            baseImage.width * scale
        );

    editor.height =
        Math.round(
            baseImage.height * scale
        );


    ectx.clearRect(
        0,
        0,
        editor.width,
        editor.height
    );


    ectx.drawImage(
        baseImage,
        0,
        0,
        editor.width,
        editor.height
    );


    textLayer = null;

}


// ============================================================
// LOAD GLYPH ONCE
// ============================================================

function getGlyphImage(src) {

    if (imageCache.has(src)) {

        return Promise.resolve(
            imageCache.get(src)
        );

    }


    return new Promise(function (resolve, reject) {

        const image = new Image();

        image.onload = function () {

            imageCache.set(
                src,
                image
            );

            resolve(image);

        };


        image.onerror = reject;

        image.src = src;

    });

}


// ============================================================
// DRAW CAPTION
// ============================================================

async function drawCaption() {

    if (!baseImage) return;


    ectx.clearRect(
        0,
        0,
        editor.width,
        editor.height
    );


    ectx.drawImage(
        baseImage,
        0,
        0,
        editor.width,
        editor.height
    );


    if (!textLayer) return;


    const packs = loadPacks();

    const packIndex =
        Number(packSelect.value);


    const pack =
        packs[packIndex];


    if (!pack) return;


    const size =
        Number(
            document.getElementById(
                "sizeInput"
            ).value
        );


    let x = textLayer.x;

    let y = textLayer.y;


    const gap =
        Math.max(
            1,
            size * 0.08
        );


    ectx.globalAlpha =
        textLayer.opacity;


    for (
        const character of textLayer.text
    ) {

        const src =
            pack.glyphs[
                character
            ];


        // --------------------------------
        // USER HANDWRITING
        // --------------------------------

        if (src) {

            try {

                const image =
                    await getGlyphImage(src);


                const scale =
                    size / 90;


                const width =
                    180 * scale;


                const height =
                    90 * scale;


                ectx.drawImage(

                    image,

                    x,

                    y - height * 0.75,

                    width,

                    height

                );


                x += width * 0.72;

            } catch (error) {

                console.error(
                    "Glyph error:",
                    character,
                    error
                );

            }

        }

        // --------------------------------
        // NORMAL FALLBACK FONT
        // --------------------------------

        else {

            ectx.fillStyle =
                textLayer.color;


            ectx.font =
                `${size}px cursive`;


            ectx.textBaseline =
                "alphabetic";


            ectx.fillText(
                character,
                x,
                y
            );


            x +=
                ectx.measureText(
                    character
                ).width + gap;

        }

    }


    ectx.globalAlpha = 1;

}


// ============================================================
// ADD CAPTION
// ============================================================

document.getElementById("addCaption")
    .addEventListener(
        "click",
        function () {

            if (!baseImage) {

                alert(
                    "Please upload a photo first."
                );

                return;
            }


            const text =
                document.getElementById(
                    "captionInput"
                ).value;


            if (!text.trim()) {

                alert(
                    "Please type a caption."
                );

                return;
            }


            textLayer = {

                text: text,

                x: 30,

                y: Math.min(
                    editor.height - 30,
                    editor.height * 0.82
                ),

                opacity: 1,

                color:
                    document.getElementById(
                        "colorInput"
                    ).value

            };


            drawCaption();

        }
    );


// ============================================================
// TOUCH DRAGGING
// ============================================================

editor.addEventListener(
    "pointerdown",
    function (event) {

        if (!textLayer) return;


        event.preventDefault();


        const rect =
            editor.getBoundingClientRect();


        const x =
            (event.clientX - rect.left) *
            (editor.width / rect.width);


        const y =
            (event.clientY - rect.top) *
            (editor.height / rect.height);


        const size =
            Number(
                document.getElementById(
                    "sizeInput"
                ).value
            );


        const textTop =
            textLayer.y -
            size * 1.2;


        if (
            y >= textTop &&
            y <= textLayer.y + 30
        ) {

            dragging = true;


            dragOffset = {

                x:
                    x - textLayer.x,

                y:
                    y - textLayer.y

            };


            try {

                editor.setPointerCapture(
                    event.pointerId
                );

            } catch (_) {}

        }

    },
    { passive: false }
);


// ============================================================
// MOVE CAPTION
// ============================================================

editor.addEventListener(
    "pointermove",
    function (event) {

        if (!dragging || !textLayer)
            return;


        event.preventDefault();


        const rect =
            editor.getBoundingClientRect();


        const x =
            (event.clientX - rect.left) *
            (editor.width / rect.width);


        const y =
            (event.clientY - rect.top) *
            (editor.height / rect.height);


        textLayer.x =
            x - dragOffset.x;


        textLayer.y =
            y - dragOffset.y;


        drawCaption();

    },
    { passive: false }
);


// ============================================================
// STOP DRAGGING
// ============================================================

function stopDragging(event) {

    dragging = false;

    try {

        editor.releasePointerCapture(
            event.pointerId
        );

    } catch (_) {}

}


editor.addEventListener(
    "pointerup",
    stopDragging
);

editor.addEventListener(
    "pointercancel",
    stopDragging
);


// ============================================================
// SIZE
// ============================================================

document.getElementById(
    "sizeInput"
).addEventListener(
    "input",
    function () {

        drawCaption();

    }
);


// ============================================================
// COLOR
// ============================================================

document.getElementById(
    "colorInput"
).addEventListener(
    "input",
    function () {

        if (textLayer) {

            textLayer.color =
                this.value;

        }


        drawCaption();

    }
);


// ============================================================
// CHANGE PACK
// ============================================================

packSelect.addEventListener(
    "change",
    function () {

        imageCache.clear();

        drawCaption();

    }
);


// ============================================================
// CHANGE CAPTION
// ============================================================

document.getElementById(
    "captionInput"
).addEventListener(
    "input",
    function () {

        if (textLayer) {

            textLayer.text =
                this.value;

            drawCaption();

        }

    }
);


// ============================================================
// EXPORT PNG
// ============================================================

document.getElementById(
    "exportBtn"
).addEventListener(
    "click",
    async function () {

        if (!baseImage) {

            alert(
                "Please upload a photo first."
            );

            return;
        }


        await drawCaption();


        const image =
            editor.toDataURL(
                "image/png",
                1.0
            );


        const link =
            document.createElement("a");


        link.download =
            "handcaption.png";


        link.href = image;


        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

    }
);