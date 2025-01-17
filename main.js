var sound = new Howl({
  src: ['TR808.sprite.mp3', 'TR808.sprite.wav'],
  sprite: {
    BD: [0, 1500],
    BDA: [2000, 1500],
    SD: [4000, 500],
    SDA: [5000, 500],
    HH: [6000, 300],
    HHA: [7000, 500]
  }
});

var cv = [0, 0, 0, 0, 0];
var searchParams = new URLSearchParams(location.search);
var mixed;

if (incv = searchParams.get("cv")) {
  incv = incv.split(",");
  if (incv.length == 5) {
    for (i = 0; i < 5; i++) {
      cv[i] = +incv[i] & 255;
      d3.select("[data-key='" + i + "']").property("value", cv[i]);
      d3.select("#value-" + i + "").text(cv[i]);
    }
  }
}
var svg = d3.select("svg");
var color = d3.scaleLinear().domain([0, 0xFF]).range(['white', 'blue']);
var step = 0, run = false, bpm = 120;

// javascripts ~ op gives the 1's compliment for some reason
// so we xor the cv value with 0xFF for both inversions instead
function stroke(d, i) {
  return (d > (0xFF ^ cv[Math.floor(i / 32)])) ? 'black' : 'lightgray';
}

function strokewidth(d, i) {
  return (d > 192 && d > (0xFF ^ cv[Math.floor(i / 32)])) ? 3 : 1;
}

function fill(d, i) {
  return run && step == (i % 32) && (d > (0xFF ^ cv[Math.floor(i / 32)])) ?
    'orange' : color(d);

}

function U8Mix(a, b, x) {
  return x * b + (0xFF - x) * a >> 8;
}

function update() {
  var xpage = cv[3] >> 6;
  var xbalance = (cv[3] << 2) & 0xFF;
  var ypage = cv[4] >> 6;
  var ybalance = (cv[4] << 2) & 0xFF;

  d3.select("#coordinates").text(xpage + ":" + xbalance + "," + ypage + ":" + ybalance);

  mixed = [];
  for (i = 0; i < 96; i++) {
    var a = drum_map[(xpage + 0) * 5 + ypage + 0][i];
    var b = drum_map[(xpage + 1) * 5 + ypage + 0][i];
    var c = drum_map[(xpage + 0) * 5 + ypage + 1][i];
    var d = drum_map[(xpage + 1) * 5 + ypage + 1][i];
    mixed[i] = U8Mix(U8Mix(a, b, xbalance), U8Mix(c, d, xbalance), ybalance);
  }

  svg.selectAll('.cell').data(mixed);
  svg.selectAll('.cell')
    .style('stroke', stroke)
    .style('stroke-width', strokewidth)
    .style('fill', color);

  var url = new URL(location.href);
  var permalink = url.origin + url.pathname + "?cv=" + cv.join(",");
  d3.select("#permalink").attr('href', permalink);
}

svg.append("g").attr('transform', 'translate(10,30)').selectAll('.cell')
  .data(drum_map[0])
  .enter()
  .append('rect')
  .attr('class', 'cell')
  .attr('transform', function (d, i) {
    return "translate(" +
      ((i % 32) * 28) + "," +
      (Math.floor(i / 32 - 1) * 28) + ")"
      ;
  })
  .attr('width', '24px')
  .attr('height', '24px')
  .attr('rx', 5)
  .attr('ry', 5)
  .style('fill', fill);

update();

d3.selectAll('.cv').on('input', function () {
  key = +d3.select(this).attr("data-key");
  cv[key] = +this.value;
  d3.select("#value-" + key).text(this.value);
  update();
});


d3.select('#run').on('click', function () { run = !run; step = 0; tick(); });
d3.select('#bpm').on('input', function () { bpm = +this.value; d3.select('#value-bpm').text(this.value); });

function tick() {
  d3.selectAll('.cell').style('fill', fill);
  if (!run) return;

  if (mixed[step + 0] > (255 ^ cv[0])) { sound.play(mixed[step + 0] > 192 ? "BDA" : "BD"); }
  if (mixed[step + 32] > (255 ^ cv[1])) { sound.play(mixed[step + 32] > 192 ? "SDA" : "SD"); }
  if (mixed[step + 64] > (255 ^ cv[2])) { sound.play(mixed[step + 64] > 192 ? "HHA" : "HH"); }
  step = (step + 1) % 32;

  if (run) setTimeout(tick, 60000 / 8 / bpm);
}