let s;
let cnv;
let sectionsN;
let sectionsNames; // Names of sections
let attributes; // Booleans about sections requiring attributes
let sketch = [];
let sectionsData = [];
let grammar = {}; // Contains all drawings
let layers = []; // Contains current drawing
let layers2; // For squiggle animation
let aventura;
let squigInterval;

const frameDelay = 350;

let currentWeight = 4;
let currentColor = '#000000';

const imgsMemo = {};

async function setup() {
	select('footer').html(`${version} por Sergio Rodríguez Gómez`);
	s = +select('#chalkboard').style('width').replace('px','');
	cnv = createCanvas(s, s).parent('#canvas');
	background(255);

	const newStructureDiv = createDiv('').class('new-struct').parent('#gui');
	createP('Arrastra aquí una gramática').class('info').parent(newStructureDiv);

	const params = getURLParams();
	let file;
	if (params.model === 'local') {
		file = await JSON.parse(atob(localStorage.getItem('igramaModel')));
		newStructureDiv.remove();
		start(file);
	}

	select('#gui').drop(async (f) => {
		if (f.subtype === 'json') {
			const data = f.data;
			newStructureDiv.remove();
			start(data);
		} else if (f.subtype === 'png') {
			const dataUrl = f.data;
			const data = await decodeImage(dataUrl);
			start(data);
		} else {
			alert("El archivo no es compatible");
		}
	});
}

function start(file) {
	sectionsN = file.metadata.sectionsN;
	sectionsNames = file.metadata.sectionsNames;
	sectionsData = file.sections;
	attributes = file.attributes;
	sketch = decodeSketch(file.sketch);
	grammar = file.grammar;

	aventura = new Aventura();
	aventura.setGrammar(grammar);
	expand();
	gui();
}

function expand() {
	layers = aventura.expandGrammar('base').split('|').map(drawing => decodeDrawing(drawing));
	const text = layers.map(d => d.attribute).reverse().join(' ');
	select('#text-overlay').html(text);
	layers2 = getLayers2(layers);
	drawLayers(layers);
}

function gui() {
	selectAll('.gui-container').map(d => d.remove());
	clearInterval(squigInterval);

	const guiCont = createDiv('').class('gui-container').parent('#gui');

	// ACTIONS & TOOLS
	const actionsDiv = createDiv('').class('actions-container').parent(guiCont);

	createButton('Generar').class('action-btn').parent(actionsDiv).mouseClicked(() => {
		expand();
	});

	createCheckbox('Tembloroso').class('info').parent(actionsDiv).changed(function() {
		if (this.checked()) {
			let step = 0;
			squigInterval = setInterval(() => {
				drawLayers(step % 2 === 0 ? layers : layers2);
				step++;
			}, frameDelay);
		} else {
			clearInterval(squigInterval);
			drawLayers(layers);	
		}
	});

	createButton('Exportar .png').class('action-btn').parent(actionsDiv).mouseClicked(() => {
		save(cnv, 'igramaImg.png');
	});

	createButton('Exportar .gif').class('action-btn').parent(actionsDiv).mouseClicked(() => {
		getGif();
	});

	createButton('Exportar gramática').class('action-btn').parent(actionsDiv).mouseClicked(() => {
		const grammar = getGrammar();
		saveJSON(grammar, 'igrama');
	});
}

async function drawLayers(layers) {
	background(255);
	noFill();
	for (let [index, layer] of layers.entries()) {
		const {w, h, x, y} = sectionsData[index];
		if (layer.type === 'url') {
			if (imgsMemo[layer.url] === undefined) {
				imgsMemo[layer.url] = await new Promise(resolve => {loadImage(layer.url, d => {resolve(d)})});
			}
			image(imgsMemo[layer.url], x, y, w, h);
		} else if (layer.type === 'vector') {
			for (let doodle of layer) {
				if (doodle.length === 0) continue
				stroke(doodle.color);
				strokeWeight(doodle.weight);
				beginShape();
				curveVertex(doodle[0][0],doodle[0][1]);
				for (let v of doodle) {
					curveVertex(v[0],v[1]);
				}
				curveVertex(doodle[doodle.length-1][0],doodle[doodle.length-1][1]);
				endShape();
			}
		}
	}	
}

function decodeDrawing(data) {
	if (data === '') {
		return []
	}
	const [type, content, attribute] = data.split(drawingDelimiter);
	let decoded;
	if (type === 'vector') {
		decoded = content.split('**').map(doodle => {
			const [color, weight, v] = doodle.split('&');
			const xy = [];
			xy.color = color;
			xy.weight = weight;
			if (v === undefined) return xy
			const flat = v.split(',');
			for (let i = 0; i < flat.length; i += 2) {
				xy.push([+flat[i], +flat[i + 1]])
			}
			return xy
		});		
	} else {
		decoded = {
			url: content
		}
	}
	decoded.attribute = attribute;
	decoded.type = type;
	return decoded
}

function getLayers2(layers) {
	const r = 3;
	const layers2 = [];
	for (let layer in layers) {
		if (layers[layer].type === 'vector') {
			layers2[layer] = [];
			for (let doodle in layers[layer]) {
				layers2[layer][doodle] = [];
				layers2[layer][doodle].color = layers[layer][doodle].color;
				layers2[layer][doodle].weight = layers[layer][doodle].weight;
				let c = 0;
				for (let v of layers[layer][doodle]) {
					layers2[layer][doodle][c] = [...v];
					let rnd = random(1);
					if (rnd < 0.5) {
						layers2[layer][doodle][c][0] += int(random(-r, r));
					} else {
						layers2[layer][doodle][c][1] += int(random(-r, r));	
					}
					c++;
				}
			}
			layers2[layer].attribute = layers[layer].attribute;
			layers2[layer].type = layers[layer].type;
		} else {
			layers2[layer] = layers[layer];
		}
		
	}
	return layers2
}

function getGif() {
	const g1 = createGraphics(s,s);
	const g2 = createGraphics(s,s);
	const gif = new GIF({
		workers: 2,
		quality: 10
	});
	g1.image(get(), 0, 0);
	const layers2 = getLayers2(layers);
	drawLayers(layers2);
	g2.image(get(), 0, 0);
	drawLayers(layers);
	gif.addFrame(g1.elt, {delay: frameDelay});
	gif.addFrame(g2.elt, {delay: frameDelay});
	gif.on('finished', function(blob) {
		//window.open(URL.createObjectURL(blob));
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.setAttribute("download", `igramaImg.gif`);
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);			
		g1.remove();
		g2.remove();
	});
	gif.render();
}

function getGrammar() {
	const modelData = {
		metadata: {
			sectionsN,
			sectionsNames,
			attributes
		},
		grammar,
		sections: sectionsData,
		sketch: btoa(sketch.map(doodle => doodle.toString()).join('**'))
	}
	return modelData
}