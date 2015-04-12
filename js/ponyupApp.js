var ponyupApp = angular.module('ponyupApp', ['ngRoute']);

ponyupApp.config(['$routeProvider',
	function ($routeProvider) {
		$routeProvider.
		when('/intro', {
			controller: 'ponyupCtrl',
			templateUrl: 'templates/intro.html'
		}).
		when('/horses/:raceId', {
			controller: 'horsesCtrl',
			templateUrl: 'templates/horsesForm.html'
		}).
		when('/races/:raceId/:horseId', {
			controller: 'raceHistoryCtrl',
			templateUrl: 'templates/raceHistoryForm.html'
		}).
		when('/results/:raceId', {
			controller: 'resultCtrl',
			templateUrl: 'templates/results.html'
		}).
        when('/imageCap', {
            controller: 'imageCapCtrl',
            templateUrl: 'templates/imageCapture.html'
        }).otherwise({redirectTo: '/intro'});
	}
]);

ponyupApp.directive('ponyupTopbar', function() {
	return {
		require: 'E',
		replace: true,
		templateUrl: 'directives/ponyup-topbar.html'
	}
});

ponyupApp.directive('ponyupFooter', function() {
	return {
		require: 'E',
		replace: true,
		templateUrl: 'directives/ponyup-footer.html'
	}
});

ponyupApp.controller('ponyupCtrl', function($scope, $log) {
	$scope.createNewRace = function() {
		var numRaces = parseInt(localStorage.getItem('numRaces'));
		if (!numRaces) {
			numRaces = 1;
		} else {
			numRaces = numRaces + 1;
		}
		localStorage.setItem('numRaces', numRaces);

		window.location.href = "#/horses/" + numRaces;
	}

	$scope.removeRace = function(raceId) {
		localStorage.removeItem('horses.' + raceId);
		getRaces();
	}

	var getRaces = function() {
		var races = [];
		for (i in localStorage) {
			if (i.indexOf("horses") > -1) {
				var raceNum = parseInt(i.substring(7, i.length));
				$log.info("raceNum = " + raceNum);
				races.push(raceNum);
			}
		}

		$log.info(races);
		$scope.races = races;
	}

	getRaces();
});

ponyupApp.controller('horsesCtrl', function($scope, $log, $routeParams, $window) {
	$scope.raceId = $routeParams.raceId;

	var getHorses = function(raceId) {
		var horses = localStorage.getItem('horses.' + raceId);
		if (!horses) {
			$scope.horses = [
				{
					id: 1
				}
			];
		} else {
			$scope.horses = JSON.parse(horses);
		}
	}

	var calcHorseAvg = function(horse) {
		var winPct = parseFloat(horse.winPct);
		$log.info("winPct = " + winPct);
		var races = horse.history;
		var totalTimes = 0.0;
		for (var j = 0; j<races.length; j++) {
			var curRace = races[j];
			var raceLength;
			if (curRace.dist_type == 'F') {
				//convert furlongs to miles
				raceLength = parseFloat(curRace.distance) * 0.125;
			} else {
				//already in miles
				raceLength = parseFloat(curRace.distance);
			}
			$log.info("raceLength = " + raceLength);
			var winningTime = parseFloat(curRace.winTime);
			$log.info("winningTime = " + winningTime);
			//convert lengths to miles
			var milesBehind = parseFloat(curRace.behind) / 60 * 0.125;
			$log.info("milesBehind = " + milesBehind);
			//find the horse's time from the winning time and miles behind (avg horse takes ~131 seconds to run a mile)
			var horseRaceTime = winningTime + (131.67375 * milesBehind);
			$log.info("horseRaceTime = " + horseRaceTime);
			//	mileTime/1 mi = horseRaceTime/raceLength;
			var mileTime = horseRaceTime / raceLength;
			$log.info("mileTime = " + mileTime);
			totalTimes = totalTimes + mileTime;
		}
		var avgTime = totalTimes / races.length;
		$log.info("avgTime = " + avgTime);
		//account for jockey win percent
		var avgTimeWithJockey = avgTime + 0.25*(1-winPct/100)*avgTime;
		$log.info("avgTimeWithJockey = " + avgTimeWithJockey);
		horse.avgTimeWithJockey = avgTimeWithJockey;
		horse.avgTime = avgTime;
	}

	$scope.add = function() {
		$scope.horses.push({id: $scope.horses.length+1});
	}

	$scope.save = function() {
		localStorage.setItem('horses.' + $scope.raceId, JSON.stringify($scope.horses));
		$scope.success = true;
		$window.scrollTo(0,0);
	}

	$scope.modifyHistory = function(horseId) {
		localStorage.setItem('horses.' + $scope.raceId, JSON.stringify($scope.horses));
		window.location.href = "#/races/" + $scope.raceId + "/" + horseId;
	}

	$scope.calculate = function() {
		var horses = $scope.horses;
		for (var i=0; i<horses.length; i++) {
			var curHorse = horses[i];
			calcHorseAvg(curHorse);
		}
		localStorage.setItem('horses.' + $scope.raceId, JSON.stringify($scope.horses));
		window.location.href = "#/results/" + $scope.raceId;
	}

	getHorses($scope.raceId);
});

ponyupApp.controller('raceHistoryCtrl', function($scope, $log, $routeParams) {

	var getHorseById = function(horseId) {
		var horses = $scope.horses;
		for (var i = 0; i < horses.length; i++) {
			if (horses[i].id == horseId) {
				return $scope.horses[i];
			}
		}
	}

	$scope.addRace = function() {
		var selectedHorse = getHorseById($scope.horseId);
		selectedHorse.history.push({id: selectedHorse.history.length + 1});
	}

	$scope.save = function() {
		localStorage.setItem('horses.' + $scope.raceId, JSON.stringify($scope.horses));
		window.location.href = "#/horses/" + $scope.raceId;
	}

	$scope.raceId = $routeParams.raceId;
	$scope.horses = JSON.parse(localStorage.getItem('horses.' + $routeParams.raceId));
	$scope.horseId = $routeParams.horseId;
	var selectedHorse = getHorseById($scope.horseId);
	if (!selectedHorse.history) {
		selectedHorse.history = [
			{ id: 1 }
		];
	}
	$scope.distTypeOptions = [
		{
			abbr: 'F',
			name: 'Furlongs',
		},
		{
			abbr: 'M',
			name: 'Miles'
		}
	];

});

ponyupApp.controller('resultCtrl', function($scope, $log, $routeParams) {
	var getHorses = function(raceId) {
		var horses = localStorage.getItem('horses.' + raceId);
		if (!horses) {
			$scope.horses = [
				{
					id: 1
				}
			];
		} else {
			$scope.horses = JSON.parse(horses);
		}
	}

	getHorses($routeParams.raceId);
});

ponyupApp.controller('imageCapCtrl', function($scope, $q, $log) {
    var video = document.querySelector('video');
    var image = null;

    var pictureWidth = 640;
    var pictureHeight = 360;

    var fxCanvas = null;
    var texture = null;

    var setupComplete = false;

    var errors = {
        getUserMedia: ' No getUserMedia support',
        glfx: 'No glfx.js support',
        webgl: 'No WebGL support',
        denied: 'User denied camera access'
    }

    function checkRequirements() {
        var deferred = $q.defer();

        if (!Modernizr.getusermedia) {
            $scope.hasGetUserMedia = false;
            deferred.reject(errors.getUserMedia);
        } else {
            $scope.hasGetUserMedia = true;
        }

        if (Modernizr.webgl) {
            try {
                fxCanvas = fx.canvas();
            } catch (e) {
                deferred.reject(errors.glfx);
            }
        } else {
            deferred.reject(errors.webgl);
        }

        deferred.resolve();

        return deferred.promise;
    }

    function searchForRearCamera() {
        var deferred = $q.defer();
        if (MediaStreamTrack && MediaStreamTrack.getSources) {
            MediaStreamTrack.getSources(function (sources) {
                var rearCameraIds = sources.filter(function (source) {
                    return (source.kind === 'video' && source.facing === 'environment');
                }).map(function (source) {
                    return source.id;
                });

                if (rearCameraIds.length) {
                    deferred.resolve(rearCameraIds[0]);
                } else {
                    deferred.resolve(null);
                }
            });
        } else {
            deferred.resolve(null);
        }

        return deferred.promise;
    }

    function setupVideo(rearCameraId) {
        var deferred = $q.defer();
        var getUserMedia = Modernizr.prefixed('getUserMedia', navigator);
        var videoSettings = {
            video: {
                optional: [
                    {
                        width: {min: pictureWidth}
                    },
                    {
                        height: {min: pictureHeight}
                    }
                ]
            }
        };

        if (rearCameraId) {
            videoSettings.video.optional.push({
                sourceId: rearCameraId
            });
        }

        getUserMedia(videoSettings, function (stream) {
            video.src = window.URL.createObjectURL(stream);

            window.stream = stream;

            video.addEventListener("loadedmetadata", function(e) {
                pictureWidth = this.videoWidth;
                pictureHeight = this.videoHeight;

                if (!pictureWidth && !pictureHeight) {
                    var waitingForSize = setInterval(function () {
                        if (video.videoWidth && video.videoHeight) {
                            pictureWidth = video.videoWidth;
                            pictureHeight = video.videoHeight;

                            clearInterval(waitingForSize);
                            deferred.resolve();
                        }
                    }, 100);
                } else {
                    deferred.resolve();
                }
            }, false);
        }, function () {
            deferred.reject(errors.denied);
        });

        return deferred.promise;
    }

    $scope.takePicture = function () {
        var canvas = document.querySelector('#step2 canvas');
        var img = document.querySelector('#step2 img');

        canvas.width = pictureWidth;
        canvas.height = pictureHeight;

        var ctx = canvas.getContext('2d');

        ctx.drawImage(video, 0, 0);

        texture = fxCanvas.texture(canvas);
        fxCanvas.draw(texture)
        .hueSaturation(-1, -1)
        .unsharpMask(20, 2)
        .brightnessContrast(0.2, 0.9)
        .update();

        window.texture = texture;
        window.fxCanvas = fxCanvas;

        $(img)
        .attr('src', fxCanvas.toDataURL());

        $scope.pictureTaken = true;
    }

    $scope.retake = function() {
        $scope.pictureTaken = false;
    }

    $scope.reupload = function() {
        $scope.pictureUploaded = false;
    }

    $scope.imageUpload = function(files, scope) {
        readData(files[0])
        .then(function () {
            var img = document.querySelector('#step2 img');
            var canvas = document.querySelector('#step2 canvas');

            canvas.width = pictureWidth;
            canvas.height = pictureHeight;

            var ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);

            texture = fxCanvas.texture(canvas);
            fxCanvas.draw(texture)
            .hueSaturation(-1, -1)
            .unsharpMask(20, 2)
            .brightnessContrast(0.2, 0.9)
            .update();

            window.texture = texture;
            window.fxCanvas = fxCanvas;

            $(img)
            .attr('src', fxCanvas.toDataURL());

            $scope.pictureUploaded = true;
        })
    }

    var readData = function(file) {
        var deferred = $q.defer();
        var reader = new FileReader();

        reader.onload = function() {
            var img = document.querySelector('#step2 img');

            img.onload = function() {
                setTimeout(function() {
                    pictureWidth = img.width;
                    pictureHeight = img.height;
                    deferred.resolve();
                }, 1000);
            }

            $(img).attr('src', reader.result);
        }

        reader.readAsDataURL(file);

        return deferred.promise;
    }

    checkRequirements()
    .then(searchForRearCamera)
    .then(setupVideo)
    .then(function () {
        $scope.setupComplete = true;
    })
    .catch(function (error) {
        if (error == errors.denied) {
            $scope.cameraDenied = true;
        } else {
            $scope.cameraError = true;
        }
    });
});
