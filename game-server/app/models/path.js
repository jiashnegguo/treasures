var square = require("../consts/square");
var utils = require("../util/utils");

var CELL_WIDTH =  80;
var CELL_HEIGHT =  40;
var HALF_CELL_WIDTH = 80 * 0.5;
var HALF_CELL_HEIGHT = 40 * 0.5;

pro = module.exports;

pro.init = function(opts)
{
    this.setMapSizeAndMaskArr(square.SQUARE.WIDTH, square.SQUARE.HEIGHT, square.SQUAREOBEJCTS);
}

//格子坐标转场景坐标
pro.cellToScenePos = function (n, m) {
    return { x: HALF_CELL_WIDTH * (n - m), y: (HALF_CELL_HEIGHT * (n + m)) + 400 };
};


pro.sceneToCellPos = function (x, y) {
    y -= 400;
    return {
        x: Math.floor(0.5 * (y / (HALF_CELL_HEIGHT) + x / (HALF_CELL_WIDTH)) + 0.5),
        y: Math.floor(0.5 * (y / (HALF_CELL_HEIGHT) - x / (HALF_CELL_WIDTH)) + 0.5)
    }
};


pro.setMapSizeAndMaskArr = function (mapW, mapH, maskArr) {
    this.setMapWH(mapW - 1, mapH - 1);
    this.maskArrTbl = {};
    if (maskArr) {
        for (var i = maskArr.length - 1; i >= 0; i--) {
            var v = maskArr[i];
            this.maskArrTbl[v.x + '_' + v.y] = true;
        }
    }
};

pro.setMapWH = function (w, h) {
    this.MapW = w;
    this.MapH = h;
};

pro.isMovePoint =function (x, y, isFindPath) {
    if (x < 0 || y < 0) {
        return false
    }
    if (x > this.MapW || y > this.MapH) {
        return false;
    }
    if (this.maskArrTbl && this.maskArrTbl[x + '_' + y]) {
        return false;
    }
    if (isFindPath && this.maskTable && this.maskTable[x + '_' + y]) {
        return false;
    }
    return true;
};

pro.getHValue = function (x, y) {
    // return   Math.abs(this.endP.x-x)+Math.abs(this.endP.y-y)
    return Math.sqrt(Math.pow(this.endP.x - x, 2) + Math.pow(this.endP.y - y, 2));
};

pro.getPointInfo =function (x, y, prePI) {
    var pInfo = {};
    pInfo.prePI = prePI;
    pInfo.x = x;
    pInfo.y = y;
    if (prePI) {
        pInfo.G = prePI.G + 1;
        if (Math.abs(prePI.x - x) == 1 && Math.abs(prePI.y - y) == 1) {
            pInfo.G = pInfo.G + 0.5;
        }
        pInfo.H = this.getHValue(x, y);
        pInfo.F = pInfo.G + pInfo.H;
    } else {
        pInfo.G = 0;
        pInfo.F = 0;
        pInfo.H = 0;
    }
    return pInfo;
};

pro.checkPoint = function (dx, dy, pointI) {
    var pInfo = this.getPointInfo(pointI.x + dx, pointI.y + dy, pointI);
    if (pInfo.x == this.endP.x && pInfo.y == this.endP.y) {
        return pInfo;
    } else if (this.isMovePoint(pInfo.x, pInfo.y, true)) {
        this.activeArr.push(pInfo);
        this.maskTable[pInfo.x + '_' + pInfo.y] = true;
    }
};

pro.findPoint = function (SPointI) {
    var cp = this.checkPoint(0, 1, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(1, 1, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(1, 0, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(-1, 1, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(0, -1, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(-1, -1, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(-1, 0, SPointI);
    if (cp) { return cp }
    cp = this.checkPoint(1, -1, SPointI);
    return cp;
};

pro.findCanMovePos = function (p) {
    var i = 1;
    p.x = p.x < 0 ? 0 : p.x > this.MapW ? this.MapW : p.x;
    p.y = p.y < 0 ? 0 : p.y > this.MapH ? this.MapH : p.y;
    while (!this.isMovePoint(p.x, p.y)) {
        if (this.isMovePoint(p.x, p.y - i)) {
            p.y = p.y - i
        }
        if (this.isMovePoint(p.x - i, p.y)) {
            p.x = p.x - i
        }
        if (this.isMovePoint(p.x, p.y + i)) {
            p.y = p.y + i
        }
        if (this.isMovePoint(p.x + i, p.y)) {
            p.x = p.x + i
        }
        i++;
    }
    return p;
},

pro.getPath = function (sp, ep) {
    var p1 = this.sceneToCellPos(sp.x, sp.y);
    var p2 = this.sceneToCellPos(ep.x, ep.y);
    if (sp && ep && p1.x == p2.x && p1.y == p2.y) {
        return null;
    }

    p1 = this.findCanMovePos(p1);
    p2 = this.findCanMovePos(p2);
    this.startP = p1;
    this.endP = p2;
    this.activeArr = [];
    this.maskTable = {};
    var fdP = this.findPoint(pro.getPointInfo(p1.x, p1.y));
    while (!fdP) {
        this.activeArr.sort(function (a, b) {
            return a.F - b.F
        });
        if (!this.activeArr[0] || this.activeArr[0].G > 150) { return null; }
        fdP = this.findPoint(this.activeArr.shift());
    }
    var pathA = [];
    while (fdP) {
        if (!pathA[1]) {
            pathA.unshift({x:fdP.x, y:fdP.y});
        } else {
            if ((pathA[1].x == fdP.x && pathA[0].x == fdP.x) || (pathA[1].y == fdP.y && pathA[0].y == fdP.y) || (pathA[1].x - pathA[0].x) / (pathA[1].y - pathA[0].y) == (pathA[0].x - fdP.x) / (pathA[0].y - fdP.y)) {
                pathA[0] = fdP;
            } else {
                pathA.unshift({x:fdP.x, y: fdP.y});
            }
        }
        fdP = fdP.prePI;
    }
    pathA.shift();
    for (var i = 0; i < pathA.length; i++) {
        pathA[i] = this.cellToScenePos(pathA[i].x, pathA[i].y)
    };
    this.startP = this.endP = this.activeArr = this.maskTable = null;
    return pathA;
};

pro.getRandomPosition = function()
{
    var cellX = utils.rand(0, square.SQUARE.WIDTH);
    var cellY = utils.rand(0, square.SQUARE.HEIGHT);

    var pos = this.cellToScenePos(cellX, cellY);

    return this.findCanMovePos(pos);
};

