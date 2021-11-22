const maxSections = 10;
const sketchColor = '#00ffff';
const sketchWeight = 4;

const palette = ["#FFFFFF", "#000000", "#FF4136", "#FF6565", 
"#F19317", "#FFE923", "#1B508C", "#2785F1", "#2ECC40", "#1DE1A3"];

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