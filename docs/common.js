const version = "1.2.1";

const maxSections = 10;
const sketchColor = '#00ffff';
const sketchWeight = 4;

const palette = [
	"#FFFFFF", "#bdbdbd", "#595959", "#000000",
	"#1B508C", "#2785F1", "#00c9a5", "#2ECC40",
	"#FF4136", "#FF6565", "#ff6bd3", "#a243de",
	"#914a29", "#ff8400", "#f0ae67", "#FFE923"
];

const codedImgSize = 512;
const drawingDelimiter = '%%';

function decodeSketch(data) {
	let decoded = atob(data).split('**').map(doodle => {
		const flat = doodle.split(',');
		const xy = [];
		for (let i = 0; i < flat.length; i += 2) {
			xy.push([+flat[i], +flat[i + 1]])
		}
		return xy
	});
	return decoded
}

function showSketch() {
	background(255);
	noFill();
	stroke(sketchColor);
	strokeWeight(sketchWeight);
	for (let doodle of sketch) {
		beginShape();
		curveVertex(doodle[0][0],doodle[0][1]);
		for (let v of doodle) {
			curveVertex(v[0],v[1]);
		}
		curveVertex(doodle[doodle.length-1][0],doodle[doodle.length-1][1]);
		endShape();
	}
}

function saveJSON(obj, filename) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], {
		type: "text/plain"
	}));
	a.setAttribute("download", `${filename}.json`);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function saveTXT(obj, filename) {
	const a = document.createElement("a");
	a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], {
		type: "text/plain"
	}));
	a.setAttribute("download", `${filename}.txt`);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function encodeToImage(data, layersData = false) {
	selectAll('.coded-miniature').forEach(d => d.remove());

	const str = data + "!END!END!";
	const utf = (ch) => ch !== undefined ? ch.charCodeAt(0) : 32;
  const w = codedImgSize;
	const h = codedImgSize;
  const graphics = createGraphics(w, h).class('coded-miniature');
	const canvas = graphics.elt
  const context = canvas.getContext("2d");
  canvas.width = w;
  canvas.height = h;

	graphics.background(255);
	graphics.loadPixels();
	for (let i = 0; i < graphics.pixels.length; i++) {
		if (i % 3 !== 0) {
			graphics.pixels[i] = random(200, 255);
		}
	}
	graphics.updatePixels();
	if (layersData) {
		drawMiniature(graphics, layersData);
	}
	graphics.stroke(0);
	graphics.strokeWeight(10);
	graphics.fill(255);
	
	graphics.textSize(Math.floor(w*0.1));
	graphics.textAlign(CENTER, CENTER);
	graphics.text("igrama", w*0.2, h*0.9);
	graphics.noFill();
	graphics.rect(0, 0, w, h);

	const imageDataObject = context.getImageData(0, 0, w, h);
  const imageData = imageDataObject.data;

	const decomposed = [];
	for (let i = 0; i < str.length; i++) {
		const bin = utf(str[i]).toString(2).padStart(8, '0');
		const v1 = bin.slice(0, 4);
		const v2 = bin.slice(-4);
		decomposed.push(v1);
		decomposed.push(v2);
	}

  let counter = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = 4 * (y * w) + 4 * x;
			if (counter >= decomposed.length) continue
			for (let i = 0; i < 3; i++) {
				const bin = imageData[index + i].toString(2).padStart(8, '0');
				const crossover = parseInt(bin.slice(0, 4) + decomposed[counter], 2);
				imageData[index + i] = crossover
				counter++;
			}
    }
  }
  context.putImageData(imageDataObject, 0, 0);
  dataUrl =  canvas.toDataURL('image/png', 1.0);
  canvas.remove();
	
  return dataUrl
}

function drawMiniature(graphics, layersData) {
	const gen = layersData.map(d => {
		const sel = random(d);
		return sel === undefined ? [] : sel
	});
	graphics.noFill();
	for (let layer of gen) {
		for (let doodle of layer) {
			if (doodle.length === 0) continue
			graphics.stroke(doodle.color);
			graphics.strokeWeight(map(doodle.weight, 0, width, 0, codedImgSize));
			graphics.beginShape();
			let v0 = map(doodle[0][0], 0, width, 0, codedImgSize);
			let v1 = map(doodle[0][1], 0, width, 0, codedImgSize);
			graphics.curveVertex(v0, v1);
			for (let v of doodle) {
				const v0 = map(v[0], 0, width, 0, codedImgSize);
				const v1 = map(v[1], 0, width, 0, codedImgSize);
				graphics.curveVertex(v0, v1);
			}
			v0 = map(doodle[doodle.length-1][0], 0, width, 0, codedImgSize);
			v1 = map(doodle[doodle.length-1][1], 0, width, 0, codedImgSize);
			graphics.curveVertex(v0,v1);
			graphics.endShape();
		}
	}	
}

async function decodeImage(dataUrl) {
	const img = await new Promise(resolve => {
		loadImage(dataUrl, d => {
			resolve(d);
		})
	});
	const graphics = createGraphics(codedImgSize, codedImgSize);
	graphics.image(img, 0, 0);
	const canvas = graphics.elt
  const context = canvas.getContext("2d");
	const imageDataObject = context.getImageData(0, 0, codedImgSize, codedImgSize);
	const imageData = imageDataObject.data;

	const decomp = [];
	for (let index = 0; index < imageData.length; index += 4) {
		for (let i = 0; i < 3; i++) {
			bin = imageData[index + i].toString(2).padStart(8, '0');
			decomp.push(bin.slice(-4));
		}
  }

	let decoded = '';
	for (let i = 0; i < decomp.length; i += 2) {
		const v1 = decomp[i];
		const v2 = decomp[i + 1];
		const comp = parseInt(v1 + v2, 2);
		decoded += String.fromCharCode(comp);
	}
	
	decoded = decoded.split('!END!END!')[0];
	decoded = atob(decoded);
	return JSON.parse(decoded)
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}