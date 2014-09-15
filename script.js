var App = angular.module('App', ['ui.bootstrap']);

function nagaokaCoefficient (d, l) {
	var k  = 1 / Math.sqrt(1 + ((l / d) * (l / d)));
	var k_ = k * k;

	var EI = completeEllipticIntegral(k);

	return ( 4 / (3 * Math.PI * Math.sqrt(1 - k_)) ) * (
		( (1 - k_) / k_ * EI.K ) -
		( (1 - 2 * k_) / k_ * EI.E ) -
		k
	);

	function completeEllipticIntegral (k) {
		var a, b, a1, b1, amb, E, i, kk, IK, IE;

		kk = k*k;
		a = 1;
		b = Math.sqrt(1-kk);
		E = 1-kk/2;
		i = 1;
		do
		{
			a1 = (a+b)/2;
			b1 = Math.sqrt(a*b);
			amb = a-b;
			E -= i*amb*amb/4;
			i *= 2;
			a = a1;
			b = b1;
		} while (Math.abs(a-b)>1e-15);

		IK = Math.PI/(2*a);
		IE = E*IK;

		return {
			K : IK,
			E : IE
		};
	}
}

function coilInductance (coilDiameter, coilLength, N) {
	return nagaokaCoefficient(coilDiameter, coilLength) * 4e-7 * Math.PI * Math.PI * Math.pow(coilDiameter / 2, 2) * Math.pow(N, 2) / coilLength;
}

function coilTurns (inductance, coilDiameter, coilLength) {
	return ( Math.pow(10, 7/2) * Math.sqrt( (coilLength * inductance) / nagaokaCoefficient(coilDiameter, coilLength) ) ) / (coilDiameter * Math.PI);
}

function searchCoilTurns (inductance, diameter, spacing) {
	var turns  = 2;
	for (var i = 0; i < 1000; i++) {
		var len = (turns - 1) * spacing;
		var H = coilInductance(diameter, len, turns);
		if (inductance < H) {
			return {
				H : H,
				N : turns,
				len : len
			};
		}
		turns++;
	}
	return null;
}

App.controller('MainCtrl', function ($scope) {
	$scope.input = {
		frequency : 3.53,
		elementDiameter: 1.6,
		topElement : 2.7,
		bottomElement : 6.3,
		coilDiameter : 50,
		coilingSpacing : 2.5
	};

	try {
		$scope.input = JSON.parse(localStorage.centerLoadedWhipDesign);
	} catch (e) {
		console.log(e);
	}

	$scope.$watch('input', function (newValue, oldValue) {
		console.log('changed', newValue);
		localStorage.centerLoadedWhipDesign = JSON.stringify(newValue);

		var input = $scope.input;
		var lambda = 300 / input.frequency;
		var h = input.topElement + input.bottomElement;
		var Ka = 60 * (Math.log( (2 * h) / (input.elementDiameter / 1e3) )-1);
		var X_L = Ka * ( ( 1 / Math.tan( (2 * Math.PI) / lambda * input.topElement) ) - Math.tan( (2 * Math.PI) / lambda * input.bottomElement ) );

		var L = X_L / (2 * Math.PI * input.frequency * 1e6);

		$scope.reactance = X_L;
		$scope.inductance = L;

		var coil = searchCoilTurns(L, input.coilDiameter / 1000, input.coilingSpacing / 1000);
		if (coil) {
			$scope.coilTurns = coil.N;
			$scope.coilLength = coil.len;
			$scope.coilInductance = coil.H;
		} else {
			$scope.coilTurns = NaN;
			$scope.coilLength = NaN;
			$scope.coilInductance = NaN;
		}
	}, true);
});
