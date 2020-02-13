var qs = new URLSearchParams(window.location.search);
var ATTACK_TYPE = qs.get('attack') != null ? qs.get('attack') : 'katatedori';
function getSourceData() {
  var request = new XMLHttpRequest();
  function dataLoaded(evt) {
    initialize(evt.target.response);
  }

  function transferFailed(err) {
    console.log(err);
  }
  request.addEventListener('load', dataLoaded, false);
  request.addEventListener('error', transferFailed, false);
  request.open('GET', ATTACK_TYPE + '_waza.js');
  request.send(null);
}

getSourceData();

function initialize(json) {
  // parse json + create a tree
  var data = JSON.parse(json);
  var waza = data[ATTACK_TYPE][0].core;
  var keys = ['foot_movement', 'hand_movement', 'direction', 'name'];
  var waza_tree = {
    name: ATTACK_TYPE,
    type: 'gyaku hanmi',
    children: getChildren(waza, 0)
  };

  function getChildren(arr, inc) {
    var _children = [];
    var key = keys[inc];
    var _set = new Set(
      arr.map(function(t) {
        return t[key];
      })
    );
    var _arr = [..._set].sort();
    if (inc < keys.length) {
      inc++;
      _arr.forEach(function(a, i) {
        var techniques = arr.filter(function(t) {
          return t[key] === a;
        });
        var obj = {
          name: a,
          type: key.replace('_', ' '),
          children: getChildren(techniques, inc)
        };
        if (key === 'name') {
          obj.youtube_id = arr[i].youtube_id;
          obj.tid = arr[i].id;
          obj.rank = arr[i].rank;
        }
        if (obj.children.length === 0) {
          delete obj.children;
        }
        _children.push(obj);
      });
    }
    return _children;
  }
  initTreeGraph(waza_tree);
  loop();
}

// D3 stuff

var m = [20, 120, 20, 120];
var w = window.innerWidth - m[1] - m[3];
var h = window.innerHeight - m[0] - m[2];
var i = 0;
var _root;

var selected_node = null;
var mousedown_timer = 0;
var mousehold_limit = 80;

var tree = d3.layout.tree().size([h, w]);

var diagonal = d3.svg.diagonal().projection(function(d) {
  return [d.y, d.x];
});

var svg = d3
  .select('body')
  .append('svg')
  .attr('width', w + m[1] + m[3])
  .attr('height', h + m[0] + m[2])
  .attr('aria-labelledby', 'title')
  .attr('aria-describedby', 'desc');
const title = svg.append('svg:title').text('This is a simple example title');
const desc = svg.append('svg:desc').text('A simple description, 😳');
const vis = svg.append('g').attr('transform', 'translate(' + m[3] + ',' + m[0] + ')');

// ACCESSIBILITY

function initTreeGraph(data) {
  _root = data;
  _root.x0 = h / 2;
  _root.y0 = 0;

  function _toggleAll(d) {
    if (d.children) {
      d.children.forEach(_toggleAll);
      toggle(d);
    }
  }
  update(_root);
}

function update(source) {
  var duration = d3.event && d3.event.altKey ? 5000 : 500;

  // Compute the new tree layout.
  var nodes = tree.nodes(_root).reverse();

  // Normalize for fixed-depth.
  nodes.forEach(function(d) {
    d.y = d.depth * 180;
  });

  // Update the nodes…
  var node = vis.selectAll('g.node').data(nodes, function(d) {
    return d.id || (d.id = ++i);
  });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', function(d) {
      return 'translate(' + source.y0 + ',' + source.x0 + ')';
    })
    //
    .append('svg:a')
    .attr('xlink:href', 'http://example.com')
    //
    .on('mousedown', function(d) {
      selected_node = d;
    })
    .on('mouseup', function(d) {
      if (mousedown_timer <= mousehold_limit) {
        toggle(d);
        update(d);
      }
      selected_node = null;
      mousedown_timer = 0;
    })
    .on('mouseover', function(d) {
      if (d.type === 'name') {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(250)
          .ease('cubic-out')
          .attr('r', function(d) {
            return 20;
          });
      }
    })
    .on('mouseout', function(d) {
      if (d.type === 'name') {
        d3.select(this)
          .select('circle')
          .transition()
          .duration(250)
          .ease('cubic-out')
          .attr('r', function(d) {
            return 10;
          });
      }
    })
    .on('dblclick', function(d) {
      if (d.type === 'name') {
        handleDblClick(d);
      }
    });

  nodeEnter
    .append('circle')
    .attr('r', 1e-6)
    .style('fill', function(d) {
      return '#0';
    });

  nodeEnter
    .append('text')
    .attr('x', function(d) {
      return d.children || d._children ? -15 : 15;
    })
    .attr('dy', '.35em')
    .attr('text-anchor', function(d) {
      return d.children || d._children ? 'end' : 'start';
    })
    .attr('class', 'name')
    .text(function(d) {
      var pre = '';
      if (d.youtube_id != null) {
        pre = d.tid + ': ';
      }
      return pre + d.name;
    })
    .style('fill-opacity', 1e-6);

  nodeEnter
    .append('text')
    .attr('x', 0)
    .attr('dy', '-1em')
    .attr('text-anchor', 'middle')
    .attr('class', 'type')
    .text(function(d) {
      return d.type;
    })
    .style('fill-opacity', 1e-6);

  // Transition nodes to their new position.
  var nodeUpdate = node
    .transition()
    .duration(duration)
    .attr('transform', function(d) {
      return 'translate(' + d.y + ',' + d.x + ')';
    });

  nodeUpdate
    .select('circle')
    .attr('r', function(d) {
      return d.name != null ? 10 : 2;
    })
    .style('fill', function(d) {
      let cols = ['#EEE', '#FF0', '#F90', '#0F0', '#00F', '#90F', '#853', '#000'];
      let num = cols.length - 1;
      if (d.rank != null) {
        num = d.rank.includes('dan') ? num : num - ~~d.rank.substring(0, 1);
      }
      let col = cols[num];
      return d.children != null ? 'lightsteelblue' : col;
    });

  nodeUpdate.select('.name').style('fill-opacity', 1);

  nodeUpdate.select('.type').style('fill-opacity', 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node
    .exit()
    .transition()
    .duration(duration)
    .attr('transform', function(d) {
      return 'translate(' + source.y + ',' + source.x + ')';
    })
    .remove();

  nodeExit.select('circle').attr('r', 1e-6);

  nodeExit.select('.name').style('fill-opacity', 1e-6);

  nodeExit.select('.type').style('fill-opacity', 1e-6);

  // Update the links…
  var link = vis.selectAll('path.link').data(tree.links(nodes), function(d) {
    return d.target.id;
  });

  // Enter any new links at the parent's previous position.
  link
    .enter()
    .insert('path', 'g')
    .attr('class', 'link')
    .attr('d', function(d) {
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
    .attr('d', diagonal);

  // Transition links to their new position.
  link
    .transition()
    .duration(duration)
    .attr('d', diagonal);

  // Transition exiting nodes to the parent's new position.
  link
    .exit()
    .transition()
    .duration(duration)
    .attr('d', function(d) {
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
function toggleAll(d) {
  if (d.children) {
    d.children.forEach(toggleAll);
    toggle(d);
    update(d);
  }
}

function loop() {
  requestAnimationFrame(loop);
  if (selected_node != null) {
    mousedown_timer++;
    if (mousedown_timer > mousehold_limit) {
      openYouTubeLink(selected_node);
      selected_node = null;
      mousedown_timer = 0;
    }
  }
}

function openYoutubeLink(d) {
  window.open(`https://www.youtube.com/watch?v=${d.youtube_id}`);
}
//----------------------------------------------------------------------------//

document.body.addEventListener('keyup', onKey);
document.body.addEventListener('keydown', function(kevt) {
  if (kevt.code === 'Space') {
    kevt.preventDefault();
  }
});
function onKey(kevt) {
  kevt.preventDefault();
  if (kevt.code === 'Digit1') {
    toggle(_root);
    update(_root);
  }
  if (kevt.code === 'Digit2') {
    if (_root.children) {
      _root.children.forEach(toggle);
      _root.children.forEach(update);
    }
  }
  if (kevt.code === 'Digit3') {
    if (_root.children) {
      _root.children.forEach(function(d) {
        if (d.children) {
          d.children.forEach(toggle);
        }
      });
      _root.children.forEach(function(d) {
        if (d.children) {
          d.children.forEach(update);
        }
      });
    }
  }
  if (kevt.code === 'Digit4') {
    if (_root.children) {
      _root.children.forEach(function(d) {
        if (d.children) {
          d.children.forEach(function(d) {
            if (d.children) {
              d.children.forEach(toggle);
            }
          });
        }
      });
      _root.children.forEach(function(d) {
        if (d.children) {
          d.children.forEach(function(d) {
            if (d.children) {
              d.children.forEach(update);
            }
          });
        }
      });
    }
  }
}

function handleDblClick(d) {
  openYoutubeLink(d);
}
