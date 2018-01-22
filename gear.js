// The Drive object contains all the bits to draw and animate a drivetrain with varying sprocket
// sizes. There are two great tragedies with Drive:
//
// 1. It takes a heck of a lot of processing power to keep the svg animation going. I have managed
//    to avoid any browser paints, but it still seems to spend a lot of time in the layout and
//    graphics parts of the browser. I am not sure how to make this better. Maybe by clipping rather
//    than masking the chain svg elements?
//
// 2. The chain does not mesh perfectly with the rear sprocket. There are graphical artifacts caused
//    by the fact that the initial rotation and position of the rear gear is not set to mesh with
//    the chain properly. This would take all sorts of clever math that I can't quite get my head
//    around, although it's definitely possible. The behaviour at the moment is to mesh the chain
//    only with the master gear. There are formulas to determine the "center-center" distance for
//    two sprockets, but I don't seem to be able to make this work for my setup.
//
// 3. It's disorganised beyond beleif.

"use strict"

var Drive = {}

// This is the top object that contains the drivetrain. It takes 'draw' is a SVJ.js drawing object
// that elements will be placed in to, and 'c' is a configuration object.
Drive.DriveTrain = function (draw, c) {
    this.draw = draw
    // Create a new group to contain everything that will be created.
    this.group = this.draw.group()
    // The 'master' gear contains the 'slave' gear, that is driven.
    this.master = new Drive.Gear(this.group, c.s1Teeth, c.s1Loc[0], c.s1Loc[1], 
        c.pitch, c.rollerDia, c.slave)
    // The 'middle' contains everything that is connected by the two gears (master and slave). It's
    // also responsible for masking out the relevant links sections of the master and slave
    // sprockets, for some reason.
    this.middle = new Drive.Middle(this.master)
    this.master.setSpeed(c.speed)
    this.db = new Drive.DebugOverlay(this.middle.cl, this.middle.cl2, this.master, 
        this.master.slave, draw)
}

// Called every animation frame.
Drive.DriveTrain.prototype.step = function (dt) {
    this.master.step(dt)
    this.middle.mesh()
    this.db.step()
}

Drive.Gear = function(gr, t, x, y, pitch, roll, slave) {
    this.sgroup = gr
    this.slaveConf = slave
    this.x = x
    this.y = y
    this.t = t // Number of teeth
    this.pitch = pitch // Distance between links
    this.roll = roll // Roller dimension
    this.move = 0
    this.angle = 0
    this.speed = 0.0 // Rotational speed
    this.rotOffset = 0.0 // In degrees
    // Circumradius for drawing the gear. Links travel on the inradius of the gear polygon
    this.cr = this.pitch / (2 * Math.sin(Math.PI / this.t))
    // The links travel on the inradius
    this.r =  this.pitch / (2 * Math.tan(Math.PI / this.t)) 
    // Draw a gear. Will be made more beautiful
    this.group = draw.group()
    this.points = Drive.polyPoints(this.cr, this.t, this.x, this.y)
    this.group.polygon(this.points).fill("#000")
    var mask = this.group.mask()
    var circ = this.group.circle(this.r*2).center(this.x, this.y).fill("#fff")
    mask.add(circ)
    // Punch out circles at the vertexes of the polygon to give look of teeth
    // This is to be replaced with actual graphics
    for (var i =0; i < this.t; i++){
        mask.add(this.group.circle(this.roll).fill("#000").center(
            this.points[i][0], this.points[i][1]))
    }
    this.group.maskWith(mask)
    this.links = new Drive.GearLinks(this)
    this.group.rotate(this.angle - this.rotOffset)
    if (this.slaveConf) {
        var xx = this.slaveConf.x
        var yy = this.slaveConf.y
        this.slave = new Drive.Gear(this.sgroup, this.slaveConf.t, xx, yy, this.pitch, this.roll)
    }
}

// The master gear step function is the only one that takes in a delta time (dt) value. Everything
// else uses a "mesh" method to base location on current position of master gear.
Drive.Gear.prototype.step = function(dt) {
    this.move = dt * this.speed
    this.angle += this.move
    this.group.rotate(this.angle - this.rotOffset)
    this.links.mesh()
    if (this.slave) {
        this.slave.mesh(this)
    }
}

Drive.Gear.prototype.setSpeed = function(speed) {
    this.speed = speed
}

// Used if this is a slave gear
Drive.Gear.prototype.mesh = function(other) {
    this.angle = other.angle * (other.t / this.t)
    this.group.rotate(this.angle - this.rotOffset)
    this.links.mesh()
}


Drive.GearLinks = function (gear) {
    this.g = gear
    // Supergroup to contain the links and mask. Links must move seperately from the mask (there is
    // no mask right now)
    this.sgroup = gear.sgroup.group()
    this.group = this.sgroup.group()
    // this.group = this.sgroup.group()
    // Create the link poly points on the circumradius. Links travel on inradius, but to draw them
    // there, we need to culcalte a polygon based on the circumradius
    var points = Drive.polyPoints(this.g.cr, this.g.t, this.g.x, this.g.y)
    for (var i = 1; i < points.length; i += 2) {
        this.group.line(points[i][0], points[i][1],
            points[i - 1][0], points[i - 1][1])
            .stroke({ color: "#000", width: 10, opacity: 1.0 })
    }
    this.points = points
    this.group.rotate(this.g.angle - this.g.rotOffset)
}

// A method to apply the mask after the GearLinks have been created. To mask, we need to know where
// the chainlines start and end, and we need to have the gears created before we know that. This
// could be done in some way cleaner fashion, but I'm tired of alll this math stuff.
Drive.GearLinks.prototype.mask = function(intercepts) {
    this.mask = this.sgroup.mask()
    this.mask.add(this.sgroup.circle(this.g.cr * 3).center(this.g.x, this.g.y).fill("#fff"))
    this.mask.add(this.sgroup.polygon(intercepts).fill("#000"))
    this.sgroup.maskWith(this.mask)
}

Drive.GearLinks.prototype.mesh = function() {
    this.group.rotate(this.g.angle - this.g.rotOffset)
}

// The Middle contains both chainline objects which are drawn between the gears.
Drive.Middle = function(master) {
    this.master = master
    this.cl = new Drive.Chainline(this.master, this.master.slave, this.master.links, true)
    this.cl2 = new Drive.Chainline(this.master, this.master.slave, this.master.links, false)
    var linksMask = [
        [this.cl.line.x2, this.cl.line.y2],
        [this.cl2.line.x2, this.cl2.line.y2],
        [this.cl2.line.x1, this.cl2.line.y1],
        [this.cl.line.x1, this.cl.line.y1],
    ]
    this.master.links.mask(linksMask)
    this.master.slave.links.mask(linksMask)
}

Drive.Middle.prototype.mesh = function() {
    this.cl.mesh()
    this.cl2.mesh()
}

Drive.Chainline = function (gear, gear2, gearlinks, flip) {
    if (flip === undefined) {
        flip = true
    }
    this.direction = flip ? 1: -1
    this.flip = flip
    this.links = gearlinks
    this.sgroup = gear.sgroup
    this.gear = gear
    this.sgroup = gear.sgroup.group()
    this.group = this.sgroup.group()
    this.line = Drive.circTangentLine(gear2, gear, this.sgroup, flip)
    this.arcStep = ((2 * Math.PI) / gear.t)
    this.createChainImage(this.line, this.group)
}

Drive.Chainline.prototype.getDrawOffset = function () {
    var origin = [this.links.points[0][0] - this.gear.x, this.links.points[0][1] - this.gear.y]
    var intercept = [this.line.x2 - this.gear.x, this.line.y2 - this.gear.y]
    var dp = (origin[0] * intercept[0]) + (origin[1] * intercept[1])
    var mag = Math.hypot(origin[0], origin[1]) * Math.hypot(intercept[0], intercept[1])
    var t = Math.acos(dp / mag)
    return ((t % (this.arcStep * 2))- this.arcStep) * this.gear.r
}

Drive.Chainline.prototype.mesh = function() {
    // Whatever angle the chainwheel is at, modulo it to the angle covered by one tooth, and get the
    // distance covered by that angle. That is how much we move the chain.
    var arc = Drive.toRad(this.gear.angle) % (this.arcStep * 2) 
    var x = (arc * this.gear.r) * Math.cos(this.angle) * this.direction
    var y = (arc * this.gear.r) * Math.sin(this.angle) * this.direction
    this.group.move(x, y)
}

Drive.Chainline.prototype.createChainImage = function(line, group) {
    var xdist = line.x1 - line.x2
    var ydist = line.y1 - line.y2
    this.angle = Math.atan2(ydist, xdist)
    this.length = Math.hypot(xdist, ydist)
    var os = this.getDrawOffset()
    // Can't get it to mesh elegantly at exactly the right moment, so just overlap it
    // and mask the bad bits out. No idea how any of this works anymore
    var ca = this.flip ? -11 : -10
    var x = line.x2 + Math.cos(this.angle) * ((this.gear.pitch * ca) + os)
    var y = line.y2 + Math.sin(this.angle) * ((this.gear.pitch * ca) + os)
    var steps = this.length / (this.arcStep * 2 * this.gear.r) - ca
    var xmov = this.gear.pitch * Math.cos(this.angle)
    var ymov = this.gear.pitch * Math.sin(this.angle)
    // This will be replaced with actual graphics.
    for (var i = 0; i < steps; i++) {
        group.line(x, y, x + xmov, y + ymov).stroke({ color: "#000", width: 10})
        x += xmov * 2
        y += ymov * 2
    }
    this.mask = this.group.mask()
    this.mask.add(this.sgroup.line(line.x1, line.y1, line.x2, line.y2)
        .stroke({ color: "#fff", width: 10 }))
    this.sgroup.maskWith(this.mask)
}

Drive.DebugOverlay = function (cl, cl2, gear, gear2, draw) {
    this.gear = gear
    this.gear2 = gear2
    this.group = draw.group()
    this.bits = [
        this.group.line(cl.line.x1, cl.line.y1, cl.line.x2, cl.line.y2),
        this.group.line(cl2.line.x1, cl2.line.y1, cl2.line.x2, cl2.line.y2),
        this.group.circle(gear.r * 2).center(gear.x, gear.y),
        this.group.circle(gear.slave.r * 2).center(gear.slave.x, gear.slave.y).fill({ opacity: 0 }),
        this.group.circle(8).center(cl.line.x2, cl.line.y2),
        this.group.circle(8).center(cl.line.x1, cl.line.y1),
        this.group.circle(8).center(cl2.line.x2, cl2.line.y2),
        this.group.circle(8).center(cl2.line.x1, cl2.line.y1),
        this.group.circle(8).center(gear.links.points[0][0], gear.links.points[0][1]),
        this.l1 = this.group.line(gear.x, gear.y - gear.r, gear.x, gear.y + gear.r),
        this.l2 = this.group.line(gear2.x, gear2.y - gear2.r, gear2.x, gear2.y + gear2.r)
    ]
    for (var i in this.bits){
        this.bits[i].fill({ opacity: 0 }).stroke({ width: 2, color: "#e74c3c" })
    }
}

Drive.DebugOverlay.prototype.step= function() {
    this.l1.rotate(this.gear.angle)
    this.l2.rotate(this.gear2.angle)
}

// Returns the line connecting two circles, used to determine where the chainlines run
Drive.circTangentLine = function(c1, c2, draw, otherSide) {
    // http://mathworld.wolfram.com/Circle-CircleTangents.html 
    // Probably doing this in more steps or less simply than I need to because I'm bad at math and
    // don't know the most efficient way.
    var rd = c1.r - c2.r
    var lx = c1.x - c2.x
    var ly = c1.y - c2.y
    var l = Math.sqrt(lx * lx + ly * ly)
    var a0 = Math.atan2(ly, lx)
    if (otherSide === true) {
        // For chainline length - we will need the original theta from here
        var at = -Math.atan2(rd , l) + Math.PI + a0
    } else {
        at = Math.atan2(rd , l) + a0
    }
    var x1 = -c1.r * Math.sin(at) + c1.x
    var y1 = c1.r * Math.cos(at) + c1.y
    var x2 = -c2.r * Math.sin(at) + c2.x
    var y2 = c2.r * Math.cos(at) + c2.y
    return {x1: x1, y1: y1, x2: x2, y2: y2}
}

Drive.betweenVector = function betweenVector (cx, cy, x1, y1, x2, y2) {
    var a = [x1 - cx, y1 - cy]
    var b = [x2 - cx, y2 - cy]
    var dp = (a[0] * b[0]) + (a[1] * b[1])
    var mag = Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1])
    return Math.acos(dp/mag)
}

Drive.polyPoints = function(cr ,t, x, y) {
    var points = []
    for (var i = 0; i < t; i++) {
        points[i] = []
        points[i][0] = cr * Math.cos(2 * Math.PI * i / t) + x
        points[i][1] = cr * Math.sin(2 * Math.PI * i / t) + y
    }
    return points
}

// Converts from degrees to radians.
Drive.toRad = function (degrees) {
    return degrees * (Math.PI / 180)
}

var height = 500
var width = 1500
/*global SVG:true*/
var draw = SVG("sprockets").viewbox(0, 0, width, height)
var config = {
    pitch: 25,
    rollerDia: 18,
    speed: -0.04,
    s1Loc: [500, 250],
    s1Teeth: 44,
    slave: { t: 20, x: 1220, y: 250 }
}
var train = new Drive.DriveTrain(draw, config)

var previous = 0
var dt = 0
var step = function(timestamp) {
    dt = timestamp - previous
    previous = timestamp
    train.step(dt)
    window.requestAnimationFrame(step)
}
window.requestAnimationFrame(step)