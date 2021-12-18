let s;
let cnv;
let sectionsN;
let sectionsNames = [];
let attributes = [];
let sketch = [];
let undoStack = [];
let sectionsData = [];

let drawingSketch = true;

function setup() {
	select('footer').html(`${version} por Sergio Rodríguez Gómez`);
	s = +select('#chalkboard').style('width').replace('px','');
	select('#overlay').style('width', s+'px').style('height', s+'px');
	cnv = createCanvas(s, s).parent('#canvas');
	strokeJoin(ROUND);
	background(255);

	const newStructureDiv = createDiv('').class('new-struct').parent('#gui');
	createP('Escoge el número de secciones:').class('info').parent(newStructureDiv);
	const sectionSelector = createSelect().class('select').parent(newStructureDiv).changed(() => {
		sectionsN = +sectionSelector.value();
		newStructureDiv.remove();
		randomSections();
		gui();
	});
	for (let i = 1; i <= maxSections; i++) {
		sectionSelector.option(i === 1 ? 'Selecciona...' : i);
	}
	createP('...o arrastra aquí un modelo').class('info').parent(newStructureDiv);

	select('#gui').drop((file) => {
		if (file.subtype === 'json') {
			sectionsN = file.data.metadata.sectionsN;
			sectionsData = file.data.sections;
			attributes = [];
			sketch = decodeSketch(file.data.sketch);
			newStructureDiv.remove();
			gui();
		} else {
			alert("El archivo no es compatible");
		}
	});
}

function getModel() {
	const modelData = {
		metadata: {
			sectionsN,
			sectionsNames,
			attributes,
			size: s
		},
		sections: sectionsData,
		sketch: btoa(sketch.map(doodle => doodle.toString()).join('**'))
	};
	return modelData
}

function randomSections() {
	for (let i = 0; i < sectionsN; i++) {
		const w = random(100, s);
		const h = random(100, s);
		sectionsData[i] = {
			w, h, i,
			x: min(random(s), s - w),
			y: min(random(s), s - h)
		};
	};
}

function gui() {
	selectAll('.gui-container').forEach(d => d.remove());
	const guiCont = createDiv('').class('gui-container').parent('#gui');
	showSketch();

	// SECTIONS
	const sectionsDiv = createDiv('').class('sections-container').parent(guiCont);
	for (let i = sectionsN - 1; i >= 0; i--) {
		createButton(i).class('section-btn').parent(sectionsDiv).mouseClicked(function () {
			drawingSketch = false;
			select('#overlay').style('cursor', 'default');

			selectAll('.section-btn').forEach(d => {
				d.removeClass('selected')
			});
			
			this.addClass('selected');
			showSections(i);
		})
	}

	createButton('Guía').class('section-btn').addClass('guide').parent(sectionsDiv).mouseClicked(function () {
		drawingSketch = true;
		select('#overlay').style('cursor', 'crosshair');
		selectAll('.section-btn').forEach(d => {
			d.removeClass('selected')
		});
		this.addClass('selected');
		showSections();
	});

	// ACTIONS & TOOLS
	const actionsDiv = createDiv('').class('actions-container').parent(guiCont);
	const emojiBtns = createDiv('').class('emoji-btns-container').parent(actionsDiv);

	createButton('↩️').class('action-btn').addClass('emoji-btn').parent(emojiBtns).mouseClicked(() => {
		if (sketch.length <= 0) return
		undoStack.push(sketch.pop());
		showSketch();
	});

	createButton('↪️').class('action-btn').addClass('emoji-btn').parent(emojiBtns).mouseClicked(() => {
		if (undoStack.length <= 0) return
		sketch.push(undoStack.pop());
		showSketch();
	});

	createButton('💣').class('action-btn').addClass('emoji-btn').parent(emojiBtns).mouseClicked(() => {
		sketch = [];
		undoStack = [];
		background(255);
	});

	createButton('Exportar modelo').class('action-btn').parent(actionsDiv).mouseClicked(() => {
		sectionNamesPrompt(() => {
			const model = getModel();
			saveJSON(model, 'modelo');
		});
	});

	createButton('Compartir').class('action-btn').parent(actionsDiv).mouseClicked(function() {
		sectionNamesPrompt(() => {
			const model = getModel();
			const url = `../gramatica/?model=url&data=${btoa(JSON.stringify(model, null, 2))}`;
			navigator.clipboard.writeText(url);
			this.html('¡Copiado!');
			setTimeout(() => {
				this.html('Compartir');
			}, 1000);
		});
	});

	createButton('>>>').class('action-btn').parent(actionsDiv).mouseClicked(() => {
		sectionNamesPrompt(() => {
			const model = getModel();
			const url = btoa(JSON.stringify(model, null, 2));
			localStorage.setItem('igramaModel', url);
			window.location.href = `../gramatica/?model=local`;
		});
	});

	showSections();
	updateSketch();
	select('#overlay').style('cursor', 'crosshair');
	select('.guide').addClass('selected');
}

function updateSketch() {
	const sketchAction = () => {
		const doodle = [];
		if (drawingSketch === true) {
			let interval = setInterval(() => {
				doodle.push([mouseX, mouseY]);
				if (doodle.length >= 2) {
					const x1 = doodle[doodle.length - 1][0];
					const x2 = doodle[doodle.length - 2][0];
					const y1 = doodle[doodle.length - 1][1];
					const y2 = doodle[doodle.length - 2][1];
					strokeWeight(sketchWeight);
					stroke('#ff00ff');
					line(x1, y1, x2, y2);					
				}
				if (!mouseIsPressed) {
					clearInterval(interval);
					const simpleDoodle = simplify(doodle, 4, false) // Simplify from simplify.js
					sketch.push(simpleDoodle);
					undoStack = [];
					showSketch();
				}
			}, 10);
		}
	};

	select('#overlay').mousePressed(sketchAction).touchStarted(sketchAction);
}

function showSections(i) {
	selectAll('.non-adjustable-section').forEach(d=>d.remove());
	selectAll('.adjustable-section').forEach(d=>d.remove());

	for (let j = 0; j < sectionsN; j++) {
		if (j !== i || i === undefined) {
			showNonAdjustableSection(j);
		}
	}

	if (i !== undefined) {
		showAdjustableSection(i);
		updateAdjust();
	}	
}

function showNonAdjustableSection(i) {
	createDiv(i)
		.class('non-adjustable-section')
		.style('width', sectionsData[i].w + 'px')
		.style('height', sectionsData[i].h + 'px')
		.style('left', sectionsData[i].x + 'px')
		.style('top', sectionsData[i].y + 'px')
		.parent('#overlay');
}

function showAdjustableSection(i) {
	const section = createDiv(i)
		.class('adjustable-section')
		.attribute('i', i)
		.style('width', sectionsData[i].w + 'px')
		.style('height', sectionsData[i].h + 'px')
		.style('left', sectionsData[i].x + 'px')
		.style('top', sectionsData[i].y + 'px')
		.parent('#overlay');

	createDiv('')
		.class('corner')
		.parent(section);
}

function updateAdjust() {
	let interval;
	const section = select('.adjustable-section');
	const corner = select('.corner');
	const i = section.attribute('i');
	let fixedX;
	let fixedY;
	let movedX;
	let movedY;

	const adjustAction = (e) => {
		const {x, y, w, h} = sectionsData[i];
		let refX = e === undefined ? mouseX : fixedX;
		let refY = e === undefined ? mouseY : fixedY;
		const offsetX = refX - x;
		const offsetY = refY - y;

		if (offsetX >= w - 20 && offsetY >= h - 20 || isCorner) {
			// JALANDO DE LA ESQUINA
			interval = setInterval(() => {
				refX = e === undefined ? mouseX : movedX;
				refY = e === undefined ? mouseY : movedY;	
				let newW = refX - x;
				let newH = refY - y;
				newW = newW + x >= s ? s - x : newW;
				newH = newH + y >= s ? s - y : newH;
				sectionsData[i].w = newW;
				sectionsData[i].h = newH;
				section.style('width', sectionsData[i].w  + 'px');
				section.style('height', sectionsData[i].h + 'px');
				if (!mouseIsPressed) {clearInterval(interval)}
			}, 100);			
		} else {
			// MOVIENDO
			interval = setInterval(() => {
				refX = e === undefined ? mouseX : movedX;
				refY = e === undefined ? mouseY : movedY;					
				let newX = refX - offsetX;
				let newY = refY - offsetY;
				// Mantener nueva posición dentro de los límites del canvas
				newX = newX < 0 ? 0 : newX > s - w ? s - w : newX;
				newY = newY < 0 ? 0 : newY > s - h ? s - h : newY;
				sectionsData[i].x = newX;
				sectionsData[i].y = newY;
				section.style('left', sectionsData[i].x + 'px');
				section.style('top', sectionsData[i].y + 'px');
				if (!mouseIsPressed) {clearInterval(interval)}
			}, 100);
		}
	}

	section.mousePressed(function() {
		adjustAction();
	}).touchStarted(function(e) {
		fixedX = e.touches[0].pageX;
		fixedY = e.touches[0].pageY;
		adjustAction(e);
	}).touchMoved(function(e) {
		movedX = e.touches[0].pageX;
		movedY = e.touches[0].pageY;
	});

	let isCorner = false;
	corner.touchStarted(function(){
		isCorner = true;
	}).touchEnded(()=>{
		isCorner = false;
	})
}

function sectionNamesPrompt(callback) {
	selectAll('.multiprompt').map(d=>d.remove());

	const multiPrompt = createDiv('').class('multiprompt');
	createP('Estas configuraciones son opcionales... <br><br>').parent(multiPrompt);
	createP('Define nombres para las secciones: <br><br>').parent(multiPrompt);

	const inputs = [];
	const attr = [];
	for (let i = sectionsN - 1; i >= 0; i--) {
		const cont = createDiv('').class('multiprompt-line').parent(multiPrompt);
		createSpan(`Sección ${i}:`).parent(cont);
		inputs[i] = createInput(i).parent(cont).attribute("maxlength", 20);
		attr[i] = createCheckbox(' atributo?').parent(cont);
	}

	createP('<br>').parent(multiPrompt);

	let template = false;
	createCheckbox('Exportar plantillas?').parent(multiPrompt).changed(function () {
		template = this.checked();
	});

	const btnDiv = createDiv('').class('alert-btn-container').parent(multiPrompt);

	createButton('Cancelar').class('alert-btn').parent(btnDiv).mouseClicked(function() {
		multiPrompt.remove();
	});
	createButton('Continuar').class('alert-btn').parent(btnDiv).mouseClicked(async function() {
		for (let i = 0; i < sectionsN; i++) {
			sectionsNames[i] = inputs[i].value().replace(" ","_");
			attributes[i] = attr[i].checked();
			if (template) {
				let {x, y, w, h} = sectionsData[i];
				const im = get(x, y, w, h);
				im.resize(im.width * 3, im.height * 3);
				im.save(`sec_${sectionsNames[i]}`, 'png');
				await sleep(300);
			}
		};
		if (template) {
			const im = get();
			im.resize(im.width * 3, im.height * 3);
			im.save('cnv', 'png');
			await sleep(300)
		}
		callback();
		multiPrompt.remove();
	});
}