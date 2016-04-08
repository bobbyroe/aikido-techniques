
function getSourceData() {
    var request = new XMLHttpRequest();
    function dataLoaded(evt) {
        initialize(evt.target.response);
    }

    function transferFailed(err) {
        log(err);
    }
    request.addEventListener("load", dataLoaded, false);
    request.addEventListener("error", transferFailed, false);
    request.open('GET', 'waza.js');
    request.send(null);
}

getSourceData();

function initialize (json) {

    // parse json + create a tree
    var data = JSON.parse(json);
    var waza = data.aikido[0].waza;
    var keys = ['foot_movement', 'hand_movement', 'direction', 'name'];
    var waza_tree = {
        name: 'katatetori',
        type: 'gyaku hanmi',
        children: getChildren(waza, 0)
    };

    function getChildren (arr, inc) {
        var _children = [];
        var key = keys[inc];
        var _set = new Set( arr.map( function (t) { return t[key]; }) );
        var _arr = [..._set].sort();
        if (inc < keys.length) {
            inc++;
            _arr.forEach( function (a) {
                var techniques = arr.filter( function (t) { 
                    return t[key] === a; 
                });
                var obj = {
                    name: a,
                    type: key.replace('_', ' '),
                    children: getChildren(techniques, inc)
                };
                if (obj.children.length === 0) {
                    delete obj.children;
                }
                _children.push(obj);
            });
        }
        return _children;
    }
    // log(JSON.stringify(waza_tree, null, 4));
    initTreeGraph(waza_tree);
}

// D3 stuff

var m = [20, 120, 20, 120];
var w = window.innerWidth - m[1] - m[3];
var h = window.innerHeight - m[0] - m[2];
var i = 0;
var root;

var tree = d3.layout.tree()
    .size([h, w]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) {
        return [d.y, d.x];
    });

var vis = d3.select("body").append("svg")
    .attr("width", w + m[1] + m[3])
    .attr("height", h + m[0] + m[2])
    .append("g")
    .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

function initTreeGraph(data) {
    root = data; // JSON.parse(json);
    root.x0 = h / 2;
    root.y0 = 0;

    function toggleAll(d) {
        if (d.children) {
            d.children.forEach(toggleAll);
            toggle(d);
        }
    }

    // Initialize the display to show a few nodes.
    root.children.forEach(toggleAll);
    // toggle(root.children[1]);
    // toggle(root.children[1].children[0]);
    // toggle(root.children[3]);
    // toggle(root.children[3].children[2]);
    // toggle(root.children[3].children[2].children[0]);
    // toggle(root.children[3].children[2].children[0].children[0]);

    update(root);
}


function update(source) {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;

    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse();

    // Normalize for fixed-depth.
    nodes.forEach(function(d) {
        d.y = d.depth * 180;
    });

    // Update the nodes…
    var node = vis.selectAll("g.node")
        .data(nodes, function(d) {
            return d.id || (d.id = ++i);
        });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .on("click", function(d) {
            toggle(d);
            update(d);
        });

    nodeEnter.append("circle")
        .attr("r", 1e-6)
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    nodeEnter.append("text")
        .attr("x", function(d) {
            return d.children || d._children ? -15 : 15;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) {
            return d.children || d._children ? "end" : "start";
        })
        .attr("class", "name")
        .text(function(d) {
            return d.name;
        })
        .style("fill-opacity", 1e-6);

    nodeEnter.append("text")
        .attr("x", 0)
        .attr("dy", "-1em")
        .attr("text-anchor", "middle")
        .attr("class", "type")
        .text(function(d) {
            return d.type;
        })
        .style("fill-opacity", 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
        });

    nodeUpdate.select("circle")
        .attr("r", function(d) {
            return (d.name != null) ? 10 : 2;
        })
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    nodeUpdate.select(".name")
        .style("fill-opacity", 1);

    nodeUpdate.select(".type")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .remove();

    nodeExit.select("circle")
        .attr("r", 1e-6);

    nodeExit.select(".name")
        .style("fill-opacity", 1e-6);

    nodeExit.select(".type")
        .style("fill-opacity", 1e-6);

    // Update the links…
    var link = vis.selectAll("path.link")
        .data(tree.links(nodes), function(d) {
            return d.target.id;
        });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {
                x: source.x0,
                y: source.y0
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
            var o = {
                x: source.x,
                y: source.y
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

// Toggle children.
function toggle(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
}

//----------------------------------------------------------------------------//
var log = console.log.bind(console);

