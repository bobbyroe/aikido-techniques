var width = window.innerWidth - 200;
var height = window.innerHeight;
var radius = Math.min(width, height) / 2;
var fill_hue = d3.scale.category20c();
var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);
var count = d3.select("body").append("div")
    .attr("class", 'count')
    .text('X');
var force = d3.layout.force()
    .nodes([])
    .links([])
    .charge(function (d) { return d.charge; })
    .linkDistance(0)
    .size([width, height]);
var radius = 30;
var waza_data = [];
var filtered_data = [];
var filters = {
    attack_type: 'all',
    technique_type: 'all',
    rank: 'all',
    foot_movement: 'all',
    hand_movement: 'all'
};
var all_filters = {}; // all possible filters
var all_names = []; // needed for total count
var currently_selected_filter_category = '';
var currently_selected_data = null;
var blackground = d3.select("body").append("div")
    .attr("class", "blackground hidden")
    .attr("style", `width:${width}px; height: ${height}px`);
var details_div = d3.select("body").append("div")
    .attr("class", "details hidden")
    .attr("style", `width:${width - 400}px; height: ${height - 400}px`);
// Define the div for the tooltip
var tooltop_div = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

function init (more_waza_data) { 
    d3.json("basic_waza.js", function (error, data) {

        if (error) return console.warn(error);

        // combine all techniques to a single array
        data.aikido.forEach( function (a) {
            waza_data = waza_data.concat(a.waza);
        });

        // add in the more_waza data ...
        more_waza_data.aikido.forEach( function (a) {
            waza_data = waza_data.concat(a.waza);
        });

        // TEMP only show techniques with no videos
        // waza_data = waza_data.filter( function (t) {
        //     return t.youtube_id === '';
        // });

        deriveFilterData(waza_data);

        waza_data.forEach( function (d) {
            d.charge = -200;
        });

        force.nodes(waza_data);
        var gs = svg.selectAll('g')
            .data(waza_data)
            .enter().append('g')
            .attr("transform", function (d, i) { 
                return `translate( ${(Math.random() * width)},${(Math.random() * height)})`;
            })
            .on("mouseover", handleMouseOver)                  
            .on("mouseout", handleMouseOut)
            .on("dblclick", handleDblClick)
            .call(force.drag);

        var circle = gs.append('circle')
            .attr('r', function (d) { return radius; })
            // .attr('fill', function (d) { return fillHueAttack(d.attack_type); })
            // .attr("stroke", function (d) { return fillHueAttack(d.attack_type); })
            // .attr('fill', function (d) { return fillHueName(d.name); })
            // .attr("stroke", function (d) { return fillHueName(d.name); })
            .attr('fill', function (d) { return fillHueFeet(d.foot_movement); })
            .attr("stroke", function (d) { return d3.hsl(0, 0.8, 1.0); })
            .attr('stroke-width', function (d) { return (d.youtube_id === "") ? 4 : 0; });

        var text = gs.append('text')
            .attr("text-anchor", "middle")
            .attr('fill', '#e0e0e0')
            .text(function (d, i) { return d.name; })
            .attr('dx', function (d, i) { return 0; })
            .attr('dy', function (d, i) { return -5; })
            .style('font-size', '14px');

        var symbol = gs.append('text')
            .attr("text-anchor", "middle")
            .attr('fill', function (d) { return d3.hsl(0, 0.0, 0.8);})
            .text(getSymbol)
            .attr('dx', function (d, i) { return -12; })
            .attr('dy', function (d, i) { return 15; })
            .style('font-size', '18px');

        // var rank_text = gs.append('text')
        //     .attr("text-anchor", "middle")
        //     .attr('fill', function (d) { return d3.hsl(0, 0.0, 0.8);})
        //     .text(getRankNumber)
        //     .attr('dx', function (d, i) { return 12; })
        //     .attr('dy', function (d, i) { return 15; })
        //     .style('font-size', '18px');

        force.on("tick", function () {
            svg.selectAll('g').attr("transform", function (d) {
                return `translate(${d.x},${d.y})`;
            });
        });
        force.start();
    });
}

function update () {

    // reset
    filtered_data = waza_data.filter( function (w) {
        var attack_match    = filters.attack_type === 'all'    || w.attack_type === filters.attack_type;
        var technique_match = filters.technique_type === 'all' || w.technique_type === filters.technique_type;
        var rank_match      = filters.rank === 'all'           || w.rank === filters.rank;
        var foot_match      = filters.foot_movement === 'all'  || w.foot_movement === filters.foot_movement;
        var hand_match      = filters.hand_movement === 'all'  || w.hand_movement === filters.hand_movement;
        return attack_match && technique_match && rank_match && foot_match && hand_match;
    });

    updateCount(filtered_data.length);
    drawFilters(filtered_data);

    var gs = svg.selectAll('g')
        .data(filtered_data);

    // var transition = svg.transition().duration(500);

    gs.enter().append('g')
        .attr("transform", function (d) { 
            return "translate( " + d.x+ "," + d.y + ")";
        })
        .attr("opacity", 0.0).transition().duration(750)
        .attr("opacity", 1.0);
    gs.on("mouseover", handleMouseOver)                  
        .on("mouseout", handleMouseOut)
        .on("dblclick", handleDblClick)
        .call(force.drag);

    gs.exit().transition()
    .attr("opacity", 0.0).duration(750)
    .remove();

    // cleanup
    gs.selectAll("*").remove();

    var circle = gs.append('circle')
        .attr('r', function (d) { return radius; })
        // .attr('fill', function (d) { return fillHueAttack(d.attack_type); })
        // .attr("stroke", function (d) { return fillHueAttack(d.attack_type); })
        // .attr('fill', function (d) { return fillHueName(d.name); })
        // .attr("stroke", function (d) { return fillHueName(d.name); })
        .attr('fill', function (d) { return fillHueFeet(d.foot_movement); })
        .attr("stroke", function (d) { return d3.hsl(0, 0.8, 1.0); })
        .attr('stroke-width', function (d) { return (d.youtube_id === "") ? 4 : 0; });

    var text = gs.append('text')
        .attr("text-anchor", "middle")
        .attr('fill', '#e0e0e0')
        .text(function (d, i) { return d.name; })
        .attr('dx', function (d, i) { return 0; })
        .attr('dy', function (d, i) { return -8; })
        .style('font-size', '14px');

    var symbol = gs.append('text')
            .attr("text-anchor", "middle")
            .attr('fill', function (d) { return d3.hsl(fillHueAttack(d.id), 1, 0.65);})
            .text(getSymbol)
            .attr('dx', function (d, i) { return -12; })
            .attr('dy', function (d, i) { return 15; })
            .style('font-size', '18px');

    // var rank_text = gs.append('text')
    //     .attr("text-anchor", "middle")
    //     .attr('fill', function (d) { return d3.hsl(fillHueAttack(d.id), 1, 0.65);})
    //     .text(getRankNumber)
    //     .attr('dx', function (d, i) { return 12; })
    //     .attr('dy', function (d, i) { return 15; })
    //     .style('font-size', '18px');

    force.nodes(filtered_data);
    force.start();
}

function deriveFilterData (waza) {

    var attacks = new Set( waza.map( function (t) { return t.attack_type; }) );
    var types = new Set( waza.map( function (t) { return t.technique_type; }) );
    var ranks = new Set( waza.map( function (t) { return t.rank; }) );
    var feets = new Set( waza.map( function (t) { return t.foot_movement; }) );
    var hands = new Set( waza.map( function (t) { return t.hand_movement; }) );
    
    all_filters = {
        attack_type: [...attacks].sort(),
        technique_type: [...types].sort(),
        rank: [...ranks].sort(),
        foot_movement: [...feets].sort(),
        hand_movement: [...hands].sort()
    }

    all_names = [...new Set(waza.map( function (t) { return t.name; }))]

    drawFilters(waza_data);
    updateCount(waza.length);
}

function drawFilters (data) {

    var html_string = '';
    var list_el = document.getElementsByTagName('UL')[0];
    var keys = Object.keys(all_filters);

    keys.forEach(function (k) {
        html_string += `<li class="type">${k.replace('_',' ')}</li>`;

        html_string += `<li class="filter">
                <input type="radio" id="all" checked name="${k}" value="all"/>
                <label for="all">all</label>
            </li>`;
        
        all_filters[k].forEach( function (a, i) {
            html_string += getLImarkup(a, i, k);
        });
        
    });

    function getLImarkup (a, i, k) {
        var is_checked = filters[k] === a;
        var len = data.filter( function (w) { return w[k] === a; }).length;
        var is_disabled = len === 0 && currently_selected_filter_category !== k;
        var is_hidden = len === 0;

        return `<li class="filter ${is_disabled?"disabled":""}">
            <input type="radio" id="${k + i}" ${is_checked?"checked":""}
                name="${k}" value="${a}" ${is_disabled?"disabled":""}/>
            <label for="${k + i}">${a} 
                <span class="filter_count ${is_hidden?"hidden":""}">(${len})</span>
            </label>
        </li>`
    }

    list_el.innerHTML = html_string;
}

function updateCount (len) {
    count.text(len);
}

function onClick (evt) {
    var class_name = evt.target.className;
    if (class_name === 'blackground') {
        hideDetailsView();
    }
    if (class_name === 'closeX') {
        hideDetailsView();
    }
    console.log(evt.target.__data__);
}

function onChange (evt) {
    var name = evt.target.name;
    var val = evt.target.value;
    filters[name] = val;
    currently_selected_filter_category = name;
    update();
}

document.body.addEventListener('click', onClick);
document.body.addEventListener('change', onChange);

 d3.json("more_waza.js", function (error, data) { init(data); } );

// -------------------------------------------------------------------------- //
function handleMouseOver (d) {
    d.charge = -500;
    d3.select(this).select('circle')
        .transition().duration(250).ease('cubic-out')
        .attr('r', function (d) { return radius * 2; });
    force.start();

    // tooltip
    currently_selected_data = d;

    if (currently_selected_data.notes !== '') {
        document.body.addEventListener('mousemove', handleMouseMove);  
    } 
}

function handleMouseOut (d) { 
    d.charge = -200;
    d3.select(this).select('circle')
        .transition().duration(250).ease('cubic-out')
        .attr('r', function (d) { return radius; });
    force.start();

    //tooltip
    document.body.removeEventListener('mousemove', handleMouseMove); 
    tooltop_div.transition()        
        .duration(500)      
        .style("opacity", 0);   
}

function handleMouseMove (evt) {    
    tooltop_div.transition()        
        .duration(200)      
        .style("opacity", .9);

    tooltop_div.html( getTooltipHTML() )  
        .style("left", (evt.pageX - 108) + "px")     
        .style("top", (evt.pageY + 60) + "px");    
}

function getTooltipHTML () {
    var markup = currently_selected_data.notes + '<br><br>' +
        currently_selected_data.foot_movement + '<br>' +
        currently_selected_data.hand_movement;
    return markup;
}

function handleDblClick (d) {
    // showDetailsView(d);
    window.open(`https://www.youtube.com/watch?v=${d.youtube_id}`);
}

function showDetailsView (d) {
    d3.selectAll('.blackground').classed('hidden', false);
    d3.selectAll('.details').classed('hidden', false)
        .html(getDetailsHTML(d));
}

function hideDetailsView () {
    d3.selectAll('.blackground').classed('hidden', true);
    d3.selectAll('.details').classed('hidden', true);
}

function getDetailsHTML (d) {
    console.log(d);
    return `<div class="closeX" style="left:${width - 430}px; top: 0px">X</div>
        <h2 class="technique_name">${capitalize(d.attack_type)} ${capitalize(d.name)}</h2>
        <iframe width="420" height="315" 
            src="https://www.youtube.com/embed/${d.youtube_id}" 
            frameborder="0" allowfullscreen>
        </iframe>
        <div class="notes">Notes: ${d.notes}</div>
        <div class="technique_type hidden">Type: ${d.technique_type}</div>
        <div class="rank">Rank: ${d.rank}</div>`

}
// -------------------------------------------------------------------------- //
function capitalize (str) {
    return str.toLowerCase().replace( /\b\w/g, function (m) {
        return m.toUpperCase();
    });
}
function getSymbol (d) { 
    var symbol = '⤴︎'; // irimi, offline irimi, step offline, switch feet, tenkan
    switch (d.foot_movement) {
    case 'irimi':
        symbol = '↑';
        break;
    case 'offline irimi':
        symbol = '⤴︎';
        break;
    case 'step offline':
        symbol = '⊿';
        break;
    case 'switch feet':
        symbol = '☐';
        break;
    case 'tenkan':
        symbol = '⟲';
        break;
    case 'irimi tenkan':
        symbol = '↑⟲';
        break;
    case 'none':
        symbol = '–';
        break;
    default:
        symbol = '?';
        break;
    }
    return symbol; 
}
function getRankNumber (d) {
    return (d.rank.substring(0,1));
}
function renumberAndLogData (data) {
    data.forEach(function (t, i) {
        t.id = i+1;
    });
    var techniques = new Set();
    data.forEach(function (t, i) {
        techniques.add(t.name);
    });
    console.log(JSON.stringify(data, null, 4));
}
function fillHueAttack (attack_type) {
    var n = all_filters.attack_type.indexOf(attack_type);
    return d3.hsl(n * 60, 0.9, 0.2);
}
function fillHueName (name) {
    var n = all_names.indexOf(name);
    return d3.hsl(n * 14, 0.8, 0.2);
}
function fillHueFeet (foot_movement) {
    var n = all_filters.foot_movement.indexOf(foot_movement);
    var col = d3.hsl(n * 25, 0.8, 0.2);
    return col;
}
