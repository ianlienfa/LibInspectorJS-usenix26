/**
 * From the repository: analyses (https://github.com/Swatinem/analyses)
 * @license LGPLv3 (http://www.gnu.org/licenses/lgpl-3.0-standalone.html)
 */

/**
 * Legacy Set implementation using indexOf for lookups (O(n))
 * Kept for reference and testing
 */
function LegacySet(elements) {
	this._values = [];
	if (Array.isArray(elements))
		elements.forEach(this.add.bind(this));
	else if (elements instanceof LegacySet)
		elements._values.forEach(this.add.bind(this));
}
Object.defineProperty(LegacySet.prototype, 'size', {
	enumerable: false,
	configurable: false,
	get: function () {
		return this._values.length;
	}
});
LegacySet.prototype._i = function LegacySet__i(elem) {
	return this._values.indexOf(elem);
};
LegacySet.prototype.add = function LegacySet_add(elem) {
	if (!this.has(elem))
		this._values.push(elem);
};
LegacySet.prototype.has = function LegacySet_has(elem) {
	return !!~this._i(elem);
};
LegacySet.prototype.delete = function LegacySet_delete(elem) {
	var i = this._i(elem);
	if (!~i)
		return;
	this._values.splice(i, 1);
};
LegacySet.prototype.values = function LegacySet_values() {
	return [].concat(this._values);
};

// forward some convenience functions from Array.prototype
[
	'some',
	'map',
	'every',
	'filter',
	'forEach'
].forEach(function (method) {
	LegacySet.prototype[method] = function () {
		return Array.prototype[method].apply(this._values, arguments);
	}
});

// some convenience functions
LegacySet.prototype.first = function LegacySet_first() {
	return this._values[0];
};
LegacySet.intersect = function intersect(a, b) {
	if (!a && b)
		return new LegacySet(b);
	if (!b && a)
		return new LegacySet(a);
	var s = new LegacySet();
	a.forEach(function (val) {
		if (b.has(val))
			s.add(val);
	});
	return s;
};
LegacySet.union = function union(a, b) {
	if (!a && b)
		return new LegacySet(b);
	var s = new LegacySet(a);
	if (b)
		b.forEach(s.add.bind(s));
	return s;
};
LegacySet.equals = function equals(a, b) {
	if (a.size != b.size)
		return false;
	return a.every(function (val) {
		return b.has(val);
	});
};
LegacySet.minus = function minus(a, b) {
	var s = new LegacySet(a);
	b.forEach(s.delete.bind(s));
	return s;
};


/**
 * Optimized Set implementation using native Set for O(1) lookups
 * Maintains _values array for iteration compatibility
 */
function Set(elements) {
	this._values = [];
	this._lookup = new global.Set();  // Native Set for O(1) has()
	if (Array.isArray(elements))
		elements.forEach(this.add.bind(this));
	else if (elements instanceof Set)
		elements._values.forEach(this.add.bind(this));
}
Object.defineProperty(Set.prototype, 'size', {
	enumerable: false,
	configurable: false,
	get: function () {
		return this._values.length;
	}
});
Set.prototype._i = function Set__i(elem) {
	return this._values.indexOf(elem);
};
Set.prototype.add = function Set_add(elem) {
	if (!this._lookup.has(elem)) {
		this._values.push(elem);
		this._lookup.add(elem);
	}
};
Set.prototype.has = function Set_has(elem) {
	return this._lookup.has(elem);
};
Set.prototype.delete = function Set_delete(elem) {
	if (this._lookup.has(elem)) {
		this._lookup.delete(elem);
		var i = this._values.indexOf(elem);
		this._values.splice(i, 1);
	}
};
Set.prototype.values = function Set_values() {
	return [].concat(this._values);
};

// forward some convenience functions from Array.prototype
[
	'some',
	'map',
	'every',
	'filter',
	'forEach'
].forEach(function (method) {
	Set.prototype[method] = function () {
		return Array.prototype[method].apply(this._values, arguments);
	}
});

// some convenience functions
Set.prototype.first = function Set_first() {
	return this._values[0];
};
Set.intersect = function intersect(a, b) {
	if (!a && b)
		return new Set(b);
	if (!b && a)
		return new Set(a);
	var s = new Set();
	a.forEach(function (val) {
		if (b.has(val))
			s.add(val);
	});
	return s;
};
Set.union = function union(a, b) {
	if (!a && b)
		return new Set(b);
	var s = new Set(a);
	if (b)
		b.forEach(s.add.bind(s));
	return s;
};
Set.equals = function equals(a, b) {
	if (a.size != b.size)
		return false;
	return a.every(function (val) {
		return b.has(val);
	});
};
Set.minus = function minus(a, b) {
	var s = new Set(a);
	b.forEach(s.delete.bind(s));
	return s;
};

module.exports = Set;
module.exports.LegacySet = LegacySet;
