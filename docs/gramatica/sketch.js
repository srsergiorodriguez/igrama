let cnv; // canvas
let model;

const attributesData = [];
let sketch = []; // Guide drawing decoded

const layers = []; // Contains current drawing
const layersData = []; // Contains all drawings
const undoStacks = [];

/*
LAYER -- DATOS DEL DIBUJO CON VECTOR
SECTION -- ESPACIO DONDE PUEDE DIBUJARSE (PARA HACER UNA LAYER)
SKETCH -- DIBUJO DE REFERENCIA QUE ESTÁ POR DEBAJO DE TODO
*/

let currentWeight = 4;
const maxWeight = 50;
let currentColor = '#000000';

async function setup() {
	select('footer').html(`${version} por Sergio Rodríguez Gómez`);
	noCanvas();
	strokeJoin(ROUND);

	const newStructureDiv = createDiv('').class('new-struct').parent('#gui');

	// Ajustar parámetros
	const params = getURLParams();
	let file;
	if (params.model === 'local') {
		file = JSON.parse(atob(localStorage.getItem('igramaModel')));
		newStructureDiv.remove();
		start(file);
	} else if (params.model === 'url' && params.data !== undefined) {
		file = JSON.parse(atob(params.data));
		newStructureDiv.remove();
		start(file);
	}

	// Para subir modelo
	createP('Carga un modelo:').class('info-text').parent(newStructureDiv);
	createFileInput(handleFile).class('fileinput').id('fileinput').parent(newStructureDiv);
	createElement('label','Buscar').class('fileinput-label').attribute('for', 'fileinput').parent(newStructureDiv);
	
	// Para arrastrar un modelo
	createP('o arrastra aquí un modelo...').class('info-text').parent(newStructureDiv);
	select('#gui').drop(handleFile);
}

function handleFile(file) {
	if (file.subtype === 'json' || file.subtype === 'plain') {
		const data = file.subtype === 'json' ? file.data : JSON.parse(file.data);
		start(data);
		selectAll('.new-struct').forEach(d => d.remove());
	} else {
		alert("El archivo no es compatible");
	}
}

function start(file) {
	cnv = createCanvas(file.metadata.width, file.metadata.height).parent('#canvas').style('visibility', 'visible');
	model = file;
	sketch = decodeSketch(file.sketch);
	for (let i = 0; i < model.metadata.sectionsN; i++) {
		layers[i] = [];
		layersData[i] = [];
		undoStacks[i] = [];
		attributesData[i] = [];
	}
	drawLayers(layers);
	gui();
}

function gui() {
	selectAll('.gui-container').map(d => d.remove());
	const guiCont = createDiv('').class('gui-container').parent('#gui');

	// SECTIONS
	const sectionsDiv = createDiv('').class('sections-container').parent(guiCont);

	for (let i = model.metadata.sectionsN - 1; i >= 0; i--) {
		createButton(model.metadata.sectionsNames[i]).class('section-btn').parent(sectionsDiv).mouseClicked(function () {
			selectAll('.section-btn').forEach(d => {
				d.removeClass('selected')
			});
			
			this.addClass('selected');
			showSections(i);
			updateDoodles();
		})
	}

	// ACTIONS & TOOLS
	const actionsDiv = createDiv('').class('actions-container').parent(guiCont);

	const emojiBtns = createDiv('').class('emoji-btns-container').parent(actionsDiv);

	createButton(`${iconImg(undoIcon)}`).class('action-btn').parent(emojiBtns).mouseClicked(() => {
		const i = +select('.adjustable-section').attribute('i');
		if (layers[i].length <= 0) return
		undoStacks[i].push(layers[i].pop());
		drawLayers(layers);
	});

	createButton(`${iconImg(redoIcon)}`).class('action-btn').parent(emojiBtns).mouseClicked(() => {
		const i = +select('.adjustable-section').attribute('i');
		if (undoStacks[i].length <= 0) return
		layers[i].push(undoStacks[i].pop());
		drawLayers(layers);
	});

	createButton(`${iconImg(bombIcon)}`).class('action-btn').parent(emojiBtns).mouseClicked(() => {
		layers[+select('.adjustable-section').attribute('i')] = [];
		drawLayers(layers);
	});

	createButton(`${iconImg(addToGrammarIcon)}`).class('action-btn').addClass('salient-btn').parent(actionsDiv).mouseClicked(() => {
		const index = +select('.adjustable-section').attribute('i');

		const addLayer = () => {
			if (layers[index].length === 0) {
				layersData[index].push([[]]);
			} else {
				layersData[index].push(layers[index]);
			}
			layers[index] = [];
			undoStacks[index] = [];
			drawLayers(layers);
		}
		if (model.metadata.attributes[index]) {
			attributePrompt((attribute) => {
				layers[index].attribute = attribute;
				addLayer();
			});
		} else {
			layers[index].attribute = '';
			addLayer();
		}
	});

	createButton(`${iconImg(downloadIcon)}`).class('action-btn').parent(actionsDiv).mouseClicked(() => {
		const grammar = getGrammar();
		saveJSON(grammar, 'igrama');
		const grammarCodified = btoa(JSON.stringify(grammar, null, 2));
		const dataUrl = encodeToImage(grammarCodified, layersData);
		createImg(dataUrl, "").class('coded-miniature').parent(guiCont);
	});

	createButton(`${iconImg(continueIcon)}`).class('action-btn').parent(actionsDiv).mouseClicked(() => {
		const grammar = getGrammar();
		const url = btoa(JSON.stringify(grammar, null, 2));
		localStorage.setItem('igramaModel', url);
		window.location.href = `../generador/?model=local`;
	});

	// PENCIL CONFIG
	const pencilConfigDiv = createDiv('').class('pencil-config').parent(guiCont);
	const pencilPreview = createElement('div').class('pencil-preview').parent(pencilConfigDiv);
	const pencilShape = createElement('div').class('pencil-shape').parent(pencilPreview).style("width", currentWeight+'px').style("height", currentWeight+'px').style('background', currentColor);

	createSlider(2, maxWeight, currentWeight, 1).class('action-slider').parent(pencilConfigDiv).input(function(e) {
		currentWeight = +this.value();
		pencilShape.style("width", currentWeight+'px').style("height", currentWeight+'px');
	});

	const paletteDiv = createDiv('').class('palette').parent(pencilConfigDiv);
	for (let pal of palette) {
		createButton('').class('palette-btn').parent(paletteDiv).style('background', pal).mouseClicked(() => {
			currentColor = pal;
			pencilShape.style('background', currentColor);
		});
	}

	showSections(0);
	updateDoodles();
	selectAll('.section-btn')[model.metadata.sectionsN - 1].addClass('selected');
}

function updateDoodles() {
	let interval;

	const doodleAction = () => {
		const doodle = [];
		interval = setInterval(() => {
			if (checkLimits(section)) {
				doodle.push([floor(mouseX), floor(mouseY)]);
			} else {
				recordDoodle();
			}

			if (doodle.length >= 2) {
				const x1 = doodle[doodle.length - 1][0];
				const x2 = doodle[doodle.length - 2][0];
				const y1 = doodle[doodle.length - 1][1];
				const y2 = doodle[doodle.length - 2][1];
				strokeWeight(currentWeight);
				stroke(currentColor);
				line(x1, y1, x2, y2);					
			}
			
			if (!mouseIsPressed) {
				recordDoodle();
			};
		}, 1);

		function recordDoodle() {
			clearInterval(interval);
			const simpleDoodle = simplify(doodle, 3, false) // Simplify from simplify.js
			simpleDoodle.color = currentColor;
			simpleDoodle.weight = currentWeight;
			const i = +section.attribute('i');
			layers[i].push(simpleDoodle);
			undoStacks[i] = [];
			drawLayers(layers);
		}
	};
	const section = select('.adjustable-section').mousePressed(doodleAction).touchStarted(doodleAction);
}

function drawLayers(layers) {
	background(model.metadata.bg);
	showSketch();
	noFill();
	for (let layer of layers) {
		for (let doodle of layer) {
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

function checkLimits(section) {
	if (
		mouseX > +section.attribute('x') && mouseX < +section.attribute('x') + (+section.attribute('w')) &&
		mouseY > +section.attribute('y') && mouseY < +section.attribute('y') + (+section.attribute('h'))
	) {
		return true
	}
}

function showSections(i) {
	selectAll('.non-adjustable-section').map(d=>d.remove());
	selectAll('.adjustable-section').map(d=>d.remove());

	for (let j = 0; j < model.metadata.sectionsN; j++) {
		if (j !== i || i === undefined) {
			showNonAdjustableSection(j);
		}
	}

	if (i !== undefined) {
		showAdjustableSection(i);
	}	
}

function showNonAdjustableSection(i) {
	const sectionsData = model.sections;
	createDiv(model.metadata.sectionsNames[i])
		.class('non-adjustable-section')
		.style('width', sectionsData[i].w + 'px')
		.style('height', sectionsData[i].h + 'px')
		.style('left', sectionsData[i].x + 'px')
		.style('top', sectionsData[i].y + 'px')
		.parent('#overlay');
}

function showAdjustableSection(i) {
	const sectionsData = model.sections;
	selectAll('.adjustable-section').map(d=>d.remove());
	createDiv(model.metadata.sectionsNames[i])
		.class('adjustable-section')
		.attribute('i', i)
		.attribute('w', sectionsData[i].w)
		.attribute('h', sectionsData[i].h)
		.attribute('x', sectionsData[i].x)
		.attribute('y', sectionsData[i].y)
		.style('width', sectionsData[i].w + 'px')
		.style('height', sectionsData[i].h + 'px')
		.style('left', sectionsData[i].x + 'px')
		.style('top', sectionsData[i].y + 'px')
		.parent('#overlay');
}

function getGrammar() {
	/*
	layersData
	capa1: layer
	capa2: dibujo
	capa3: doodle
	capa4: v: x,y

	coding: hex & weight & vx,vy... ** hex & weight & vx,vy... (%% drawingDelimiter) attribute
	*/
	const newData = {};
	for (let i = 0; i < model.metadata.sectionsN; i++) {
		// FOR EACH DRAWING
		newData[model.metadata.sectionsNames[i]] = layersData[i].map(drawing => {
			const vector = drawing.map(doodle => `${doodle.color}&${doodle.weight}&${doodle.toString()}`).join('**');
			const vectorAndAttribute = `vector${drawingDelimiter}${vector}${drawingDelimiter}${drawing.attribute}`;
			return vectorAndAttribute
		});
	}
	Object.assign(model.grammar, newData);
	return model
}

function attributePrompt(callback) {
	selectAll('.multiprompt').map(d=>d.remove());

	const multiPrompt = createDiv('').class('multiprompt');
	createP('Atributo requerido... <br><br>').parent(multiPrompt);
	const input = createInput('').parent(multiPrompt);

	const btnDiv = createDiv('').class('alert-btn-container').parent(multiPrompt);

	createButton('Cancelar').class('alert-btn').parent(btnDiv).mouseClicked(function() {
		multiPrompt.remove();
	});

	createButton('Continuar').class('alert-btn').parent(btnDiv).mouseClicked(function() {
		callback(input.value());
		multiPrompt.remove();
	});
}