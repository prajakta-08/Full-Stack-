document.getElementById("ai").addEventListener("change", toggleAi);
document.getElementById("fps").addEventListener("input", changeFps);

const video = document.getElementById("video");
const c1 = document.getElementById('c1');
const ctx1 = c1.getContext('2d');
const detectedOutput = document.getElementById("detectedObjects");

let cameraAvailable = false;
let aiEnabled = false;
let fps = 1000 / 16;
let modelIsLoaded = false;
let model = null;
let spokenObjects = new Set();

const objectMessages = {
    bottle: "Stay hydrated!",
    person: "A person is in view.",
    chair: "Take a seat and relax.",
    dog: "A dog is nearby!",
    cat: "A cat is visible.",
    book: "Time to read something.",
    cellphone: "Phone detected!",
    laptop: "Laptop is open.",
    tv: "Someone's watching TV!"
};

// Define which objects are useful
const usefulObjects = {
    person: "useful",
    bottle: "useful",
    chair: "useful",
    dog: "useful",
    cat: "useful",
    book: "useful",
    cellphone: "useful",
    laptop: "useful",
    tv: "useful",
    plastic_bottle: "not useful"  // example of waste object
};

var facingMode = "environment";
var constraints = {
    audio: false,
    video: { facingMode: facingMode }
};

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

function camera() {
    if (!cameraAvailable) {
        navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
            cameraAvailable = true;
            video.srcObject = stream;
        }).catch(function (err) {
            cameraAvailable = false;
            document.getElementById("loadingText").innerText = "Waiting for camera permission";
            setTimeout(camera, 1000);
        });
    }
}

function toggleAi() {
    aiEnabled = document.getElementById("ai").checked;
}

function changeFps() {
    const val = document.getElementById("fps").value;
    fps = 1000 / val;
    document.getElementById("fpsValue").innerText = val;
}

function isReady() {
    if (modelIsLoaded && cameraAvailable) {
        document.getElementById("loadingText").style.display = "none";
        document.getElementById("ai").disabled = false;
        return true;
    }
    return false;
}

function setResolution() {
    if (window.screen.width < video.videoWidth) {
        c1.width = window.screen.width * 0.9;
        let factor = c1.width / video.videoWidth;
        c1.height = video.videoHeight * factor;
    } else if (window.screen.height < video.videoHeight) {
        c1.height = window.screen.height * 0.50;
        let factor = c1.height / video.videoHeight;
        c1.width = video.videoWidth * factor;
    } else {
        c1.width = video.videoWidth;
        c1.height = video.videoHeight;
    }
}

async function ai() {
    const predictions = await model.detect(video);
    let names = [];

    ctx1.drawImage(video, 0, 0, c1.width, c1.height);

    predictions.forEach(pred => {
        const usefulness = usefulObjects[pred.class] || "not useful";
        const color = usefulness === "useful" ? "green" : "red";

        ctx1.beginPath();
        ctx1.rect(...pred.bbox);
        ctx1.lineWidth = 2;
        ctx1.strokeStyle = color;
        ctx1.stroke();

        ctx1.font = "16px Arial";
        ctx1.fillStyle = color;
        ctx1.fillText(`${pred.class} (${usefulness})`, pred.bbox[0], pred.bbox[1] > 10 ? pred.bbox[1] - 5 : 10);

        names.push(pred.class);

        if (!spokenObjects.has(pred.class)) {
            spokenObjects.add(pred.class);
            speak(objectMessages[pred.class] || `Detected a ${pred.class}`);
            setTimeout(() => spokenObjects.delete(pred.class), 5000); // avoid repeat
        }
    });

    const namesWithUsefulness = names.map(name => {
        const usefulness = usefulObjects[name] || "not useful";
        return `${name} (${usefulness})`;
    });

    detectedOutput.innerHTML = namesWithUsefulness.length 
        ? `<strong>Detected:</strong> ${namesWithUsefulness.join(", ")}`
        : "<em>No objects detected</em>";
}

function timerCallback() {
    if (isReady()) {
        setResolution();
        ctx1.drawImage(video, 0, 0, c1.width, c1.height);
        if (aiEnabled) {
            ai();
        }
    }
    setTimeout(timerCallback, fps);
}

window.onload = async function () {
    camera();
    model = await cocoSsd.load();
    modelIsLoaded = true;
    timerCallback();
};
