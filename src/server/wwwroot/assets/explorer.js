const allowVideoDemo     = true
const uiFromServer       = true;
const updateModuleUiFreq = 5000; // milliseconds

// A callback that will update the Benchmark's custom model dropdown. One of the Object Detection
// modules will, hopefully, set this for us
let BenchmarkCustomListUpdater = null;

// Elements
const resultDivId       = "results"       // Displays human readable result of the operation
const imagePreviewId    = "imgPreview"    // Previews an image
const soundPreviewId    = "sndPreview"    // Previews a sound
const imgResultMaskId   = "imgMask";      // If using SVG to draw image annotations
const imageResultId     = "imgResult"     // Displays an image result



// Setup =======================================================================

function initVideoDemo() {

    if (!allowVideoDemo) {
        document.getElementById('video-panel').style.display = 'none';
        document.getElementById('video-tab').style.display   = 'none';
        return;
    }

    try {
        navigator.getUserMedia({ video: true }, () => {
            console.log('Webcam detected.');
        }, () => {
            console.log('No webcam detected.');
            document.getElementById('video-panel').style.display = 'none';
            document.getElementById('video-tab').style.display   = 'none';
        });
        onStopVideo(null);
    }
    catch {
        console.log('Webcam detection failed.');
        document.getElementById('video-panel').style.display = 'none';
        document.getElementById('video-tab').style.display   = 'none';
    }
}

// Display server and module statuses ==========================================

/**
Sets the status text (small area top left) to be the message in the given colour.
Since this is a small area, the text needs to be short.
*/
function showLogOutput(text, variant) {

    const statusElm = document.getElementById("status");
    if (!statusElm)
        return;

    if (!text) {
        statusElm.innerHTML = "";
        return;
    }
    
    if (variant)
        statusElm.innerHTML = "<span class='text-" + variant + "'>" + text + "</span>";
    else
        statusElm.innerHTML = "<span>" + text + "</span>";

    if (variant === "warn") {
        // console.warn(text);
        console.log("WARN: " + text);
    }
    else if (variant === "error") {
        // console.error(text);
        console.log("ERROR: " + text);
    } 
    else
        console.log(text);
}

// Module operation results ====================================================

function setResultsHtml(html) {
    const resultElm = document.getElementById(resultDivId);
    if (resultElm)
        resultElm.innerHTML = html;
}

function getProcessingMetadataHtml(data) {

    let html = "<table class='timing-table'>";
    if (data.moduleId)
        html += `<tr><td>Processed by</td><td>${data.moduleId}</td></tr>`;
    if (data.processedBy)
        html += `<tr><td>Processed on</td><td>${data.processedBy}</td></tr>`;
    if (data.analysisRoundTripMs)
        html += `<tr><td>Analysis round trip</td><td>${data.analysisRoundTripMs} ms</td></tr>`;
    if (data.processMs)
        html += `<tr><td>Processing</td><td>${data.processMs} ms</td></tr>`;
    if (data.inferenceMs)
        html += `<tr><td>Inference</td><td>${data.inferenceMs} ms</td></tr>`;
    html += "</table>";

    return html;
}

/**
Displays the result from a module in the standard results window
@param data - The response from the module, which only needs to include the standard metadata from
the server.
*/
function displayBaseResults(data) {

    if (!data) {
        setResultsHtml("No results returned");
        return;
    }

    let html = data.success ? "Operation successful" : "Operation failed";

    if ('error' in data)
        html += "<div font=red>" + data.error + "</div>";
    else if ('message' in data)
        html += "<div>" + data.message + "</div>";

    html += getProcessingMetadataHtml(data);

    setResultsHtml(html);
}

/**
Displays the AI predictions from a module in the standard results window
@param data - The response from the module, which needs to include the standard metadata the server
returns as well as a predictions array containing label/confidence pairs.
*/
function showPredictionSummary(data, sortByConfidence = true) {

    if (!data || !data.predictions || !data.predictions.length) {
        setResultsHtml("No predictions returned");
        return;
    }

    // Sort descending
    if (sortByConfidence) {
        data.predictions.sort(function (a, b) {
            return b.confidence - a.confidence;
        });
    }

    let html = "<table style='width:100%'><tr><th>#</th>"
                + "<th>Label</th><th>Confidence</th></tr>";
    for (let i = 0; i < data.predictions.length; i++) {
        let pred = data.predictions[i];
        html += `<tr><td>${i}</td><td>${pred.label || "Face"}</td>`
                + `<td>${confidence(pred.confidence)}</td></tr>`;
    }
    html += "</table>";

    html += getProcessingMetadataHtml(data);

    setResultsHtml(html);
}


// Display results on the common image panel ===================================

/**
Takes the first file in the file chooser, assumes it's an image and displays
this image in the image results pane
*/
function previewImage(fileChooser) {

    if (fileChooser.files)
        showPreviewImage(fileChooser.files[0]);
}

/**
If the supplied file is an image, displays this image in the image results pane
*/
function showPreviewImage(imageToSet) {

    const imgElm = document.getElementById(imagePreviewId);
    if (!imgElm)
        return;

    clearImagePreview();

    if (imageToSet?.type.indexOf('image/') === 0) {
        imgElm.src = URL.createObjectURL(imageToSet);
        imgElm.style.height     = "auto";
        imgElm.style.visibility = "visible";
    }
    else {
        alert('Please select a valid image file.');
    }
}

function clearImagePreview() {

    const imgPreviewElm = document.getElementById(imagePreviewId);
    if (imgPreviewElm) imgPreviewElm.style.visibility = "hidden";

    // If there is no results image, meaning we're using the preview as the 
    // results image, then we'll need to also clear the mask
    let imgResultElm = document.getElementById(imageResultId);
    if (!imgResultElm) {
        const imgMaskElm = document.getElementById(imgResultMaskId);
        if (imgMaskElm) imgMaskElm.innerHTML = '';
    }
}

/**
If the supplied file is an image, displays this image in the image results pane
*/
function showResultsImage(imageToSet) {

    clearImageResult();

    let imgElm = document.getElementById(imageResultId);
    // If there's no image result element, fallback to the preview element
    if (!imgElm)
        imgElm = document.getElementById(imagePreviewId);
    if (!imgElm)
        return;

    if (imageToSet?.type.indexOf('image/') === 0) {
        imgElm.onload = adjustOverlayToFitResultImage;
        imgElm.src = URL.createObjectURL(imageToSet);
        imgElm.style.height     = "auto";
        imgElm.style.visibility = "visible";
    }
    else {
        alert('Please select a valid image file.');
    }
}

function showResultsImageData(data) {

    clearImageResult();

    let imgElm = document.getElementById(imageResultId);
    // If there's no image result element, fallback to the preview element
    if (!imgElm)
        imgElm = document.getElementById(imagePreviewId);
    if (!imgElm)
        return;

    imgElm.src = "data:image/png;base64," + data.imageBase64;
	imgElm.style.visibility = "visible";

    if (data.predictions)
        showResultsBoundingBoxes(data.predictions);
}

function clearImageResult() {

    const imgMaskElm = document.getElementById(imgResultMaskId);
    if (imgMaskElm) imgMaskElm.innerHTML = '';

    let imgElm = document.getElementById(imageResultId);
    // If there's no image result element, fallback to the preview element
    if (!imgElm)
        imgElm = document.getElementById(imagePreviewId);
    if (!imgElm)
        return;

    imgElm.style.visibility = "hidden";
    imgElm.src = "";
}

/**
When image analysis is carried out there are often annotations (eg bounding
boxes) shown on the resulting image. These are displayed using an overlay. This
method adjusts the size of the overlay to match this image.
@param this - the current image displaying an analysis result
 */
function adjustOverlayToFitResultImage() {

    let mask = document.getElementById(imgResultMaskId);
    mask.style.height = this.height + 'px';
    mask.style.width  = this.width + 'px';

    return true;
}

function showResultsBoundingBoxes(predictions, sortByConfidence = true) {

    let imgElm = document.getElementById(imageResultId);
    // If there's no image result element, fallback to the preview element
    if (!imgElm)
        imgElm = document.getElementById(imagePreviewId);
    if (!imgElm)
        return;

    if (!imgElm.width || !imgElm.height)
        return;

    if (!(predictions && predictions.length > 0))
        return;

    // Sort descending
    if (sortByConfidence) {
        predictions.sort(function (a, b) {
            return b.confidence - a.confidence;
        });
    }

    let xRatio = imgElm.width * 1.0 / imgElm.naturalWidth;
    let yRatio = imgElm.height * 1.0 / imgElm.naturalHeight;

    let svg = `
        <svg viewBox="0 0 ${imgElm.width} ${imgElm.height}">
        <defs>
            <mask id="mask">
                <rect fill="#999" x="0" y="0" width="${imgElm.width}" height="${imgElm.height}"></rect>`;

    for (let i = 0; i < predictions.length; i++) {
        let prediction = predictions[i];
        let left   = Math.min(prediction.x_min,  prediction.x_max) * xRatio;
        let top    = Math.min(prediction.y_min,  prediction.y_max) * yRatio;
        let width  = Math.abs(prediction.x_min - prediction.x_max) * xRatio;
        let height = Math.abs(prediction.y_min - prediction.y_max) * yRatio;

        svg += `<rect fill="#ffffff" x="${left}" y="${top}" width="${width}" height="${height}"></rect>`;
    }

    svg += `
            </mask>
        </defs>
        <image mask="url(#mask)" xmlns:xlink="http://www.w3.org/1999/xlink"
                xlink:href="${imgElm.src}" width="${imgElm.width}" height="${imgElm.height}"></image>`;

    let colors = ["179,221,202", "204,223,120", "164,221,239"];
    let colorIndex = 0;

    let maxLineWidth = predictions.length > 5 ? (predictions.length > 10 ? 5 : 8) : 15;
    for (let i = 0; i < predictions.length; i++) {

        let prediction = predictions[i];
        let left   = Math.min(prediction.x_min,  prediction.x_max) * xRatio;
        let top    = Math.min(prediction.y_min,  prediction.y_max) * yRatio;
        let width  = Math.abs(prediction.x_min - prediction.x_max) * xRatio;
        let height = Math.abs(prediction.y_min - prediction.y_max) * yRatio;

        let right  = left + width;
        let bottom = top + height;

        // CodeProject.AI style
        let lineWidth   = Math.min(maxLineWidth, width / 10);
        let blockWidth  = (width - lineWidth) / 5;
        let blockHeight = (height - lineWidth) / 5;
        let color       = colors[colorIndex++ % colors.length];
        let styleSolid  = `style="stroke:rgba(${color}, 1);stroke-width:${lineWidth}"`;
        let styleTrans  = `style="stroke:rgba(${color}, 0.5);stroke-width:${lineWidth}"`;

        // label
        let label = prediction.label || prediction.userid;
        if (label)
            svg += `<text x="${left}" y="${top - lineWidth}" style="stroke: none; fill:rgba(${color}, 1);font-size:12px">${label || ""}</text>`;

        // Shortcut if there are just too many items
        if (predictions.length > 15) {
            // Solid rectangle
            svg += `<rect stroke="rgb(${color})" stroke-width="1px" fill="transparent" x="${left}" y="${top}" width="${width}" height="${height}"></rect>`;
            continue;
        }

        // Top (left to right)
        let x = left - lineWidth / 2;
        svg += `<line ${styleSolid} x1="${x}" y1="${top}" x2="${x + blockWidth + lineWidth}" y2="${top}"/>`;
        x += blockWidth + lineWidth;
        svg += `<line ${styleTrans} x1="${x}" y1="${top}" x2="${x + blockWidth}" y2="${top}"/>`;
        x += 2 * blockWidth; // skip a section
        svg += `<line ${styleSolid} x1="${x}" y1="${top}" x2="${x + 2 * blockWidth + lineWidth}" y2="${top}"/>`;

        // Right (top to bottom)
        let y = top - lineWidth / 2;
        svg += `<line ${styleSolid} x1="${right}" y1="${y}" x2="${right}" y2="${y + blockHeight + lineWidth}"/>`;
        y += blockHeight + lineWidth;
        svg += `<line ${styleTrans}  x1="${right}" y1="${y}" x2="${right}" y2="${y + blockHeight}"/>`;
        y += 2 * blockHeight; // skip a section
        svg += `<line ${styleSolid} x1="${right}" y1="${y}" x2="${right}" y2="${y + 2 * blockHeight + lineWidth}"/>`;

        // Bottom (left to right)
        x = left - lineWidth / 2;
        svg += `<line ${styleSolid} x1="${x}" y1="${bottom}" x2="${x + 2 * blockWidth + lineWidth}" y2="${bottom}"/>`;
        x += 3 * blockWidth + lineWidth; // Skip a section
        svg += `<line ${styleTrans}  x1="${x}" y1="${bottom}" x2="${x + blockWidth}" y2="${bottom}"/>`;
        x += blockWidth;
        svg += `<line ${styleSolid} x1="${x}" y1="${bottom}" x2="${x + blockWidth + lineWidth}" y2="${bottom}"/>`;

        // Left (top to bottom)
        y = top - lineWidth / 2;
        svg += `<line ${styleSolid} x1="${left}" y1="${y}" x2="${left}" y2="${y + 2 * blockHeight + lineWidth}"/>`;
        y += 3 * blockHeight + lineWidth; // skip a section
        svg += `<line ${styleTrans}  x1="${left}" y1="${y}" x2="${left}" y2="${y + blockHeight}"/>`;
        y += blockHeight;
        svg += `<line ${styleSolid} x1="${left}" y1="${y}" x2="${left}" y2="${y + blockHeight + lineWidth}"/>`;
    }

    svg += `
        </svg>`;

    const imgMaskElm = document.getElementById(imgResultMaskId);
    imgMaskElm.style.height = imgElm.height + 'px';
    imgMaskElm.style.width  = imgElm.width + 'px';
    imgMaskElm.innerHTML    = svg;

    imgMaskElm.style.visibility = "visible";
    imgElm.style.visibility     = "hidden";
}

/**
Draws a horizontal line portion of a bounding box. This line is divided into 3
sections. The first 60% is solid, the second 20% translucent, the final 20%
clear. We will use this in an animation effect and have the 60/20/20 sections
rotate left to right, so the start of the solid section moves right, and as it
moves the section on the far right wraps back around. This generates a rotation
effect for the bounding box.

@param minX The left most starting point in px
@param maxX The ending point in px
@param offsetX The offset (from left) of the start of the line in px
@param y The horizontal position, increasing from top down
@param lineWidth The length of the line in px
@param color The colour of the line
@param reverse Whether to reverse horizontal coords. ie min and max and offset 
work right to left
 */
function drawHorzLine(minX, maxX, offsetX, y, lineWidth, color, reverse) {

    let blockWidth = (maxX - minX) / 5;

    let fadeColor = 'transparent';
    if (color.indexOf('a') == -1)
        fadeColor = color.replace(')', ', 0.5)').replace('rgb', 'rgba');

    let styleSolid = `style="stroke:${color};stroke-width:${lineWidth}"`;
    let styleTrans = `style="stroke:${fadeColor};stroke-width:${lineWidth}"`;

    let x, x2, svg='';

    let start = reverse ? maxX - offsetX : minX + offsetX;
    let step  = reverse ? -blockWidth : blockWidth;

    x  = Math.max(Math.min(start, maxX), minX);
    x2 = Math.max(Math.min(start + step, maxX), minX);
    if (x != x2)
        svg += `<line ${styleSolid} x1="${x}" y1="${y}" x2="${x2}" y2="${y}"/>`;

    start += step;

    x  = Math.max(Math.min(start, maxX), minX);
    x2 = Math.max(Math.min(start + step, maxX), minX);
    if (x != x2)
        svg += `<line ${styleTrans} x1="${x}" y1="${y}" x2="${x2}" y2="${y}"/>`;

    start += 2 * step; // Skip section

    x  = Math.max(Math.min(start, maxX), minX); // skip the black section
    x2 = Math.max(Math.min(start + 2 * step, maxX), minX);
    if (x != x2)
        svg += `<line ${styleSolid} x1="${x}" y1="${y}" x2="${x2}" y2="${y}"/>`;

    return svg;
}

/**
Draws a vertical line portion of a bounding box. This line is divided into 3
sections. The first 60% is solid, the second 20% translucent, the final 20%
clear. We will use this in an animation effect and have the 60/20/20 sections
rotate top to bottom, so the start of the solid section moves down, and as it
moves the section on the bottom wraps back around. This generates a rotation
effect for the bounding box.

@param minY The top most starting point in px
@param maxY The ending point in px
@param offsetY The offset (from top) of the start of the line in px
@param x The vertical position, increasing from left to right
@param lineWidth The length of the line in px
@param color The colour of the line
@param reverse Whether to reverse horizontal coords. ie min and max and offset 
work bottom to top
 */
function drawVertLine(minY, maxY, offsetY, x, lineWidth, color, reverse) {

    let blockHeight = (maxY - minY) / 5;

    let fadeColor = 'transparent';
    if (color.indexOf('a') == -1)
        fadeColor = color.replace(')', ', 0.5)').replace('rgb', 'rgba');

    let styleSolid = `style="stroke:${color};stroke-width:${lineWidth}"`;
    let styleTrans = `style="stroke:${fadeColor};stroke-width:${lineWidth}"`;

    let y, y2, svg='';

    let start = reverse ? maxY - offsetY : minY + offsetY;
    let step  = reverse ? -blockHeight : blockHeight;

    y  = Math.max(Math.min(start, maxY), minY);
    y2 = Math.max(Math.min(start + step, maxY), minY);
    if (y != y2)
        svg += `<line ${styleSolid} x1="${x}" y1="${y}" x2="${x}" y2="${y2}"/>`;

    start += step;

    y  = Math.max(Math.min(start, maxY), minY);
    y2 = Math.max(Math.min(start + step, maxY), minY);
    if (y != y2)
        svg += `<line ${styleTrans} x1="${x}" y1="${y}" x2="${x}" y2="${y2}"/>`;

    start += 2 * step; // Skip section

    y  = Math.max(Math.min(start, maxY), minY); // skip the black section
    y2 = Math.max(Math.min(start + 2 * step, maxY), minY);
    if (y != y2)
        svg += `<line ${styleSolid} x1="${x}" y1="${y}" x2="${x}" y2="${y2}"/>`;

    return svg;
}

/**
 Gets the SVG for a frame that represents an animated bounding box
 @param left left pos of frame
 @param top top pos of frame
 @param right right pos of frame
 @param bottom bottom pos of frame
 @param lineWidth linewidth
 @param color color
 @param fractionRotate amount (0 - 1) of rotation of the frame animation
 */
function getFrameInnerSVG(left, top, right, bottom, lineWidth, color, fractionRotate) {

    let width = right - left;
    let height = bottom - top;

    let ext = lineWidth / 2;

    let svg = '';

    // Top (left to right)
    let offset = width * fractionRotate;
    svg += drawHorzLine(left - ext, right + ext, offset, top, lineWidth, color, false);
    offset = -width * (1.0 - fractionRotate);
    svg += drawHorzLine(left - ext, right + ext, offset, top, lineWidth, color, false);

    // Bottom (right to left)
    offset = width * fractionRotate;
    svg += drawHorzLine(left - ext, right + ext, offset, bottom, lineWidth, color, true);
    offset = -width * (1.0 - fractionRotate);
    svg += drawHorzLine(left - ext, right + ext, offset, bottom, lineWidth, color, true);

    // Right (top to bottom)
    offset = height * fractionRotate;
    svg += drawVertLine(top - ext, bottom + ext, offset, right, lineWidth, color, false);
    offset = -height * (1.0 - fractionRotate);
    svg += drawVertLine(top - ext, bottom + ext, offset, right, lineWidth, color, false);

    // Left (top to bottom)
    offset = height * fractionRotate;
    svg += drawVertLine(top - ext, bottom + ext, offset, left, lineWidth, color, true);
    offset = -height * (1.0 - fractionRotate);
    svg += drawVertLine(top - ext, bottom + ext, offset, left, lineWidth, color, true);

    return svg;
}

/**
 Gets the SVG for a frame that represents an animated bounding box
 @param viewWidth width of viewport
 @param viewHeight height of viewport
 @param left left pos of frame
 @param top top pos of frame
 @param right right pos of frame
 @param bottom bottom pos of frame
 @param lineWidth linewidth
 @param color color
 @param fractionRotate amount (0 - 1) of rotation of the frame animation
 */
 function getFrameInnerSVG(viewWidth, viewHeight, left, top, right, bottom, lineWidth, color, fractionRotate) {
    return `<svg viewBox="0 0 ${viewWidth} ${viewHeight}">`
         + getFrameInnerSVG(left, top, right, bottom, lineWidth, color, fractionRotate)
         + `</svg>`;
 }


let previousTimeStamp, fractionRotate = 0; // 0.0 - 1.0

/**
 Draws a single frame in a rotating bounding box animation
 @param width The width of the frame
 @param height The height of the frame
 @param svgFrame The element that will hold the SVG image. This element will be
 the same size and position as the bounding box relative to the image
 */
function drawBoundingBoxFrame(width, height, svgFrame) {

    const msPerLoop = 5000;   // time to complete a full cycle in milliseconds
    let timestamp = performance.now();

    if (previousTimeStamp == undefined)
        previousTimeStamp = timestamp;

    if (previousTimeStamp !== timestamp) {

        let svg = getFrameSVG(width, height, 0, 0, width, height, 20, "rgb(179, 221, 202)", fractionRotate);
        svgFrame.innerHTML = svg;

        let rotationIncr = (timestamp - previousTimeStamp) / msPerLoop;
        fractionRotate += rotationIncr;
        if (fractionRotate > 1.0)
            fractionRotate -= 1.0;

        previousTimeStamp = timestamp;
    }
}

/**
 Draws an image and a rotating bounding box on the image
 @param imgId The id of the IMG element 
 @param imageSrc The source of the image
 @param bbox The bounding box in [left, top. right, bottom] order in px
 */
function drawImageWithRotatingBoundingBox(imgId, imageSrc, bbox) {

    const useAnimationFrame = true;

    let left = bbox[0], top = bbox[1], right = bbox[2], bottom = bbox[3]
    let width  = right - left;
    let height = bottom - top;

    // Wrap image
    let wrapper = document.createElement("div")
    wrapper.id = imgId + "-wrap";

    let img       = document.getElementById(imgId);
    img.src       = imageSrc;
    let imgHeight = img.offsetHeight;
    let imgWidth  = img.offsetWidth;

    let parentAnchor = img.parentNode;                // anchor tag
    parentAnchor.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    img.style.position = 'absolute';
    img.style.right = '0';

    svgFrame = document.createElement("div")
    wrapper.insertBefore(svgFrame, img)

    wrapper.style.position = 'relative';
    wrapper.style.height = imgHeight + "px";

    svgFrame.classList.add('svg-frame');
    svgFrame.style.position = 'absolute';
    // svgFrame.style.left   = left + 'px';
    svgFrame.style.top    = top + 'px';
    // svgFrame.style.bottom = bottom + 'px';
    svgFrame.style.right  = (imgWidth - right - 20) + 'px'; // 20 = width of lines
    svgFrame.style.height = (bottom - top) + "px";
    svgFrame.style.width  = (right - left) + "px";

    if (useAnimationFrame) {
        while (true) {
            window.requestAnimationFrame(() => 
                drawBoundingBoxFrame(width, height, svgFrame));
        }
    }
    else {
        // 50ms time step. Reasonably smooth
        setInterval(() => drawBoundingBoxFrame(width, height, svgFrame), 50);
    }
}

/**
Takes the first file in the file chooser, assumes it's a WAV file and presents
this sound in the sound preview control
*/
function previewSound(fileChooser) {

    if (fileChooser.files)
        setSound(fileChooser.files[0]);
}

/**
If the supplied file is a WAV file, presents this sound in the sound preview
control
*/
function setSound(soundToSet) {

    const audioElm = document.getElementById(soundPreviewId);
    if (!audioElm) return;
    let source = audioElm.querySelector('source');
    if (!source) return;

    if (soundToSet?.type.indexOf('audio/') === 0) {
        source.src = URL.createObjectURL(soundToSet);
        source.style.height       = "auto";
        source.style.visibility   = "visible";
        source.attributes["type"] = soundToSet?.type;
        source.parentElement.load();
    }
    else {
        source.src = "";
        alert('Please select a valid WAV file.');
    }
}

/**
Takes the first file in the file chooser, assumes it's a video file and presents
this video in the video preview control
*/
function previewVideo(fileChooser) {

    if (fileChooser.files)
        setVideo(fileChooser.files[0]);
}

/**
If the supplied file is a video file, presents this video in the video preview
control. TODO: TO BE COMPLETED
*/
function setVideo(videoToSet) {

    if (videoToSet?.type.indexOf('video/') === 0) {
    }
}

// Utilities ===================================================================

function confidence(value) {
    if (value == undefined) return '';

    return Math.round(value * 100.0) + "%";
}

function setBenchmarkCustomList() {
    if (BenchmarkCustomListUpdater)
        BenchmarkCustomListUpdater(benchmarkModel);
}

async function getModuleUis() {

    if (!uiFromServer) return;

    await makeGET('module/list/running',
        function (data) {
            if (data && data.modules) {

                // Get nav tabs and hide them all. For Benchmarking we'll only hide it if we don't
                // have any process that is updating the custom model list. Otherwise we assume we
                // have at least one object detection module in play
                let navTabs = document.querySelectorAll('#DemoTabs > .nav-item');
                for (const tab of navTabs) {
                    tab.classList.add('d-none');
                    if (tab.dataset.category == "Benchmarking" && BenchmarkCustomListUpdater)
                        tab.classList.remove('d-none');
                }

                // Go through modules' UIs and add (if needed) the UI cards to the appropriate tab,
                // and re-enable each tab that has a card
                for (let module of data.modules) {

                    if (!module.explorerUI.html || !module.explorerUI.script)
                        continue;

                    let moduleIdKey = module.moduleId.replace(/[^a-zA-Z0-9]+/g, "");

                    let category = module.category;
                    let tab = document.querySelector(`.nav-item[data-category='${category}']`);
                    if (!tab) {
                        tab = document.querySelector(`[data-category='Other']`);
                        category = "Other";
                    }
                    tab.classList.remove('d-none');

                    const panel = document.querySelector(`.tab-pane[data-category='${category}']`);

                    // In CSS, Script and HTML we replace "_MID_" by "[moduleIdKey]_" in order to
                    // ensure disambiguation. eg <div id="_MID_TextBox"> becomes <div id="MyModuleId_TextBox">

                    module.explorerUI.html   = module.explorerUI.html.replace(/_MID_/g,   `${moduleIdKey}_`);
                    module.explorerUI.script = module.explorerUI.script.replace(/_MID_/g, `${moduleIdKey}_`);
                    module.explorerUI.css    = module.explorerUI.css.replace(/_MID_/g,    `${moduleIdKey}_`);

                    // Insert HTML first
                    let card = panel.querySelector(`.moduleui[data-moduleid='${module.moduleId}']`);
                    if (!card) {
                        const html = `<div class="card mt-3 moduleui ${module.queue}" data-moduleid="${module.moduleId}">`
						           + `    <div class="card-header h3">${module.name}</div>`
						           + `    <div class="card-body">`
                                   +      module.explorerUI.html
                                   + `    </div>`
                                   + `</div>`;
                        panel.insertAdjacentHTML('beforeend', html);
                    }

                    // Next add script
                    let scriptBlock = document.getElementById("script_" + moduleIdKey);
                    if (!scriptBlock) {
                        scriptBlock = document.createElement('script');
                        scriptBlock.id          = "script_" + moduleIdKey;
                        scriptBlock.textContent = module.explorerUI.script;
                        document.body.appendChild(scriptBlock);
                    }

                    // And finally, CSS
                    let styleBlock = document.getElementById("style_" + moduleIdKey);
                    if (!styleBlock) {
                        styleBlock = document.createElement('style');
                        styleBlock.id = "style_" + moduleIdKey;
                        styleBlock.textContent = module.explorerUI.css;
                        document.body.appendChild(styleBlock);
                    }
                }

                // Ensure we have at least one tab active
                let tabTrigger = null;
                for (const tab of navTabs) {
                    if (!tab.classList.contains('d-none')) {
                        if (tab.firstElementChild.classList.contains('active')) {
                            tabTrigger = null; // We found an active tab
                            break;
                        }
                        else 
                            tabTrigger = tab.firstElementChild;
                    }
                }
                if (tabTrigger)
                    bootstrap.Tab.getInstance(tabTrigger).show()

                // remove card from modules that aren't running
                let cards = document.getElementsByClassName('moduleui');
                for (const card of cards) {
                    
                    let moduleId = card.dataset?.moduleid || "";
                    let found    = false;

                    for (let module of data.modules) {
                        if (module.moduleId == moduleId) {
                            found = true;
                            break;
                        }
                    }

                    if (!found) {
                        let moduleIdKey = moduleId.replace(/[^a-zA-Z0-9]+/g, "");
                        card.remove();

                        // Remove the Script and CSS associated with this card
                        document.getElementById("script_" + moduleIdKey)?.remove();
                        document.getElementById("style_" + moduleIdKey)?.remove();
                    }
                }
            }
        });
}

async function getModulesStatuses() {

    if (uiFromServer) return;

    await makeGET('module/list/status',
        function (data) {
            if (data && data.statuses) {

                // disable all first
                let cards = document.getElementsByClassName('card');
                for (const card of cards)
                    card.classList.replace('d-flex', 'd-none');

                let navTabs = document.getElementsByClassName('nav-item');
                for (const tab of navTabs)
                    tab.classList.add('d-none');
                
                for (let i = 0; i < data.statuses.length; i++) {

                    let moduleId = data.statuses[i].moduleId.replace(" ", "-");
                    let running  = data.statuses[i].status == 'Started';

                    let selector = data.statuses[i].queue;

                    let cards = document.getElementsByClassName('card ' + selector);
                    for (const card of cards) {
                        if (running) {
                            card.classList.replace('d-none', 'd-flex');
                            let parent = card.parentNode;
                            if (parent && parent.attributes["aria-labelledby"]) {
                                let tabListItemId = parent.attributes["aria-labelledby"].value + "-listitem";
                                let tabItem = document.getElementById(tabListItemId);
                                if (tabItem.classList)
                                    tabItem.classList.remove('d-none');
                                card.parentNode.parentNode.classList.remove('d-none');
                            }
                        }
                    }
                }
            }
        });
}

async function submitRequest(route, apiName, images, parameters, doneFunc, failFunc) {

    showLogOutput("Sending request to AI server", "info");

    if (!failFunc) 
        failFunc = displayBaseResults

    let formData = new FormData();

    // Check file selected or not
    if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
            file = images[i];
            formData.append('image' + (i + 1), file);
        }
    }

    if (parameters && parameters.length > 0) {
        for (let i = 0; i < parameters.length; i++) {
            keypair = parameters[i];
            formData.append(keypair[0], keypair[1]);
        }
    }

    let urlElm = document.getElementById('serviceUrl');
    let url = urlElm? urlElm.value.trim() : apiServiceUrl;
    url += '/v1/' + route + '/' + apiName;

    let timeoutSecs = serviceTimeoutSec;
    if (document.getElementById("serviceTimeoutSecTxt"))
        timeoutSecs = parseInt(document.getElementById("serviceTimeoutSecTxt").value);

    const controller  = new AbortController()
    const timeoutId   = setTimeout(() => controller.abort(), timeoutSecs * 1000)

    await fetch(url, {
        method: "POST",
        body: formData,
        signal: controller.signal
    })
        .then(response => {
            showLogOutput("");
            clearTimeout(timeoutId);

            if (response.ok) {
                response.json().then(data => {
                    if (data) {
                        if (data.success) {
                            if (doneFunc) doneFunc(data)
                        } else {
                            if (failFunc) failFunc(data);
                        }
                    }
                    else {
                        if (failFunc) failFunc();
                        showError(null, 'No data was returned');
                    }
                })
                .catch(error => {
                    if (failFunc) failFunc();
                    showError(null, `Unable to process server response (${error})`);
                })					
            } else {
                showError(null, 'Error contacting API server');
                if (failFunc) failFunc();						
            }
        })
        .catch(error => {
            showLogOutput("");
            if (failFunc) failFunc();

            if (error.name === 'AbortError') {
                showError(null, "Response timeout. Try increasing the timeout value");
                _serverOnline = false;
            }
            else {
                showError(null, `Unable to complete API call (${error})`);
            }
        });
}
