Rider = {}

Rider.Rider = function(draw, train, c) {
    this.draw = draw
    this.train = train
    this.frame = {}
    this.frame.svg = this.draw.group().svg(SVGE.frame)
        .move(this.train.master.x + c.frameOffsetX, this.train.master.y + c.frameOffsetY)
    this.frame.rearSvg = this.draw.group().svg(SVGE.frameRear)
        .move(this.train.master.x + c.frameOffsetX, this.train.master.y + c.frameOffsetY)
    this.wheel = {
        front: new Rider.Wheel(this, c.wheelOffset.front, c.wheelDia, 
            this.train.master.x + c.frontWheelX, this.train.master.slave.y),
        rear: new Rider.Wheel(this, c.wheelOffset.rear, c.wheelDia, 
            this.train.master.slave.x, this.train.master.slave.y)
    }
    this.pedal = {
        front: new Rider.Pedal(this, true),
        rear: new Rider.Pedal(this, false)
    }
    this.bum = this.draw.circle(200).move(this.pedal.front.foot.leg.geo.upper.x - 90, 
        this.pedal.front.foot.leg.geo.upper.y - 90).fill("#353849")
}

Rider.Rider.prototype.step = function(dt) {
    this.wheel.front.step(dt)
    this.wheel.rear.step(dt)
    this.pedal.front.step()
    this.pedal.rear.step()
}

Rider.Pedal = function(rider, front) {
    var svg = front ? SVGE.crank : SVGE.backCrank
    this.setup = {
        crankLength: 165,
        crankMargin: 8
    }
    this.multiplier = front ? 1: -1
    this.rider = rider
    this.gear = this.rider.train.master
    this.crank = this.rider.draw.group().svg(svg).move(this.gear.x, this.gear.y)
    this.foot = new Rider.Foot(this, front)
}

Rider.Pedal.prototype.step = function() {
    this.crank.rotate(this.gear.angle, 0, 0)
    this.foot.step()
}

Rider.Pedal.prototype.getPos = function() {
    var t = Drive.toRad(this.gear.angle)
    var x = Math.cos(t) * (this.setup.crankLength * this.multiplier) + this.gear.x
    var y = Math.sin(t) * (this.setup.crankLength * this.multiplier) + this.gear.y
    return { x: x, y: y }
}

Rider.Foot = function(pedal, front) {
    this.draw = pedal.rider.draw
    var image = front ? SVGE.foot : SVGE.footBack
    this.halfTurn = front ? 0 : -180
    this.limits = {
        shallow: 10,
        steep: 45,
        tippingPont: 220,
        angleOffset: 20
    }
    this.length = 178
    this.Offset = 43
    this.pedal = pedal
    this.angle = 0
    var pos = this.pedal.getPos()
    this.svg = this.draw.group().svg(image).move(pos.x, pos.y)
    this.leg = new Rider.Leg(this, front)
}

Rider.Foot.prototype.ease = function (pos) {
    return (-Math.cos(pos * Math.PI) / 2) + 0.5
}

Rider.Foot.prototype.getPos = function () {
    var pos = this.pedal.getPos()
    return {
        x: (this.length) * Math.cos(Drive.toRad(this.angle - this.Offset)) + pos.x,
        y: (this.length) * Math.sin(Drive.toRad(this.angle - this.Offset)) + pos.y
    }
}

Rider.Foot.prototype.step = function() {
    var pos = this.pedal.getPos()
    this.svg.transform({x: pos.x, y: pos.y})
    var crankAngle = Math.abs((this.pedal.gear.angle + this.halfTurn) % 360)
    var position = (crankAngle + this.limits.angleOffset) % 360
    if (position > this.limits.tippingPont) {
        var progress = this.ease((position - this.limits.tippingPont) / 
            (360 - this.limits.tippingPont))
        this.angle = -(this.limits.shallow + ((this.limits.steep - this.limits.shallow) * progress))
    } else {
        var progress = this.ease(position / this.limits.tippingPont)
        this.angle = -(this.limits.steep - ((this.limits.steep - this.limits.shallow) * progress))
    }
    this.svg.transform({rotation: this.angle})
    this.leg.step()
}

Rider.Leg = function(foot, front, xOffset, yOffset) {
    var upper = front ? SVGE.upperLeg : SVGE.upperLegBack
    var lower = front ? SVGE.lowerLeg : SVGE.lowerLegBack
    this.foot = foot
    this.draw = foot.draw
    this.geo = {
        upper: {
            x: this.foot.pedal.gear.x + 150,
            y: this.foot.pedal.gear.y - 750,
            length: 396
        },
        lower: {
            length: 390
        }
    }
    this.upper = this.draw.group().svg(upper).move(this.geo.upper.x, this.geo.upper.y)
        .transform({ scale: 0.95, cx: 0, cy: 0 })
    this.lower = this.draw.group().svg(lower).move(this.geo.upper.x, this.geo.upper.y)
}

Rider.Leg.prototype.step = function () {
    var angle = this.pedalAngle() - Math.PI
    var ha = this.scaleneAngle(this.geo.lower.length, this.geo.upper.length, this.pedalDistance())
    var ka = this.scaleneAngle(this.pedalDistance(), this.geo.lower.length, this.geo.upper.length)
    var x = this.geo.upper.length * Math.cos(ha + angle)
    var y = this.geo.upper.length * Math.sin(ha + angle)
    this.upper.rotate(Drive.toDeg(angle + ha), 0, 0)
    this.lower.transform({ x: this.geo.upper.x + x, y: this.geo.upper.y + y })
    this.lower.transform({rotation: Drive.toDeg(angle + ha + ka - Math.PI)})
}

// Gets the distance between the hip joint and the 
Rider.Leg.prototype.pedalDistance = function () {
    var pos = this.foot.getPos()
    var xDist = this.geo.upper.x - pos.x
    var yDist = this.geo.upper.y - pos.y
    return Math.hypot(xDist, yDist)
}

// Gets the angle between the hip joint and the pedal 
Rider.Leg.prototype.pedalAngle = function () {
    var pos = this.foot.getPos()
    var xDist = this.geo.upper.x - pos.x
    var yDist = this.geo.upper.y - pos.y
    return Math.atan2(yDist, xDist)
}

Rider.Leg.prototype.scaleneAngle = function (a, b, c) {
    return Math.acos(((b * b) + (c * c) - (a * a)) / (2 * b * c))
}

Rider.Wheel = function (rider, angle, wheelDia, x, y) {
    this.rider = rider
    this.angle = angle
    this.wheelDia = wheelDia
    this.svg = this.rider.draw.group().svg(SVGE.wheel).move(x - wheelDia / 2, y - wheelDia / 2)
}

Rider.Wheel.prototype.step = function(dt) {
    var movement = dt * this.rider.train.master.speed *
        (this.rider.train.master.t / this.rider.train.master.slave.t)
    this.angle += movement
    this.svg.rotate(this.angle)
}