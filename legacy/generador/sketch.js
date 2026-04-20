let cnv;
let model;
let aventura;
let format = 'png';
let layers;

async function setup() {
	select('footer').html(`${version} por Sergio Rodríguez Gómez`);
	noCanvas();
	select('#text-overlay').hide();

	const newStructureDiv = createDiv('').class('new-struct').parent('#gui');

	const params = getURLParams();
	if (params.model === 'local') {
		const file = await JSON.parse(atob(localStorage.getItem('igramaModel')));
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

async function handleFile(file) {
	if (file.subtype === 'json' || file.subtype === 'plain') {
		const data = file.subtype === 'json' ? file.data : JSON.parse(file.data);
		start(data);
	} else if (file.subtype === 'png') {
		const dataUrl = file.data;
		const data = await decodeImage(dataUrl);
		start(data);
	} else {
		alert("El archivo no es compatible");
	}
}

function start(file) {
	selectAll('.new-struct').forEach(d => d.remove());
	model = file;
	select('#canvas')
		.style('width',file.metadata.width+'px')
		.style('height',file.metadata.height+'px');

	aventura = new Aventura();
	aventura.setIgrama(file);
	expand();
	gui();
}

function expand() {
	const children = [...document.getElementById('canvas').childNodes];
	children.map(e => e.remove());

	layers = aventura.expandIgrama('base');
	const text = aventura.getIgramaText(layers);
	if (text.replace(/\s/g,'').length > 0) {
		select('#text-overlay').show().html(text);
	} else {
		select('#text-overlay').hide();
	}

	aventura.showIgrama(layers, format, 'canvas');
}

function gui() {
	selectAll('.gui-container').map(d => d.remove());
	const guiCont = createDiv('').class('gui-container').parent('#gui');

	// ACTIONS & TOOLS
	const actionsDiv = createDiv('').class('actions-container').parent(guiCont);

	createButton(`${iconImg(newImageIcon)}`).class('action-btn').addClass('salient-btn').parent(actionsDiv).mouseClicked(() => {
		expand();
	});

	let checked = false;
	const wiggleBtn = createButton(`${iconImg(wiggleIcon)}`).class('action-btn').parent(actionsDiv).mouseClicked(function () {
		checked = !checked;
		if (checked) {
			format = 'gif';
			wiggleBtn.addClass('toggled-btn');
		} else {
			format = 'png';
			wiggleBtn.removeClass('toggled-btn');
		}
		const children = [...document.getElementById('canvas').childNodes];
		children.map(e => e.remove());
		aventura.showIgrama(layers, format, 'canvas');
	});

	// createButton(`${iconImg(pngIcon)}`).class('action-btn').parent(actionsDiv).mouseClicked(async () => {
	// 	const dataUrl = await aventura.igramaDataUrl(layers, 'png');
	// 	downloadImg(dataUrl, 'igramaimg.png');
	// });

	// createButton(`${iconImg(gifIcon)}`).class('action-btn').parent(actionsDiv).mouseClicked(async () => {
	// 	const dataUrl = await aventura.igramaDataUrl(layers, 'gif');
	// 	downloadImg(dataUrl, 'igramaimg.gif');
	// });

	createButton(`${iconImg(downloadIcon)}`).class('action-btn').parent(actionsDiv).mouseClicked(() => {
		saveJSON(model, 'igrama');
	});
}