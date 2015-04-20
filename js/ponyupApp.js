var ponyupApp = angular.module('ponyupApp', ['ngRoute']);

ponyupApp.config(['$routeProvider',
	function ($routeProvider) {
		$routeProvider.
		when('/intro', {
			controller: 'ponyupCtrl',
			templateUrl: 'templates/intro.html'
		}).
        when('/raceInfo/:raceId', {
            controller: 'raceInfoCtrl',
            templateUrl: 'templates/raceInfo.html'
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
        when('/imageCap/:raceId/:horseId', {
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
		var numRaces = countRaces();
		window.location.href = "#/raceInfo/" + (numRaces+1);
	}

    $scope.removeAllRaces = function() {
        var key;
        for (var i = localStorage.length - 1; i >= 0; i--) {
            key = localStorage.key(i);
            $log.info('i = ' + i + ': ' + key);
            if ((/^race./).test(key)) {
                $log.info('Deleting ' + key);
                localStorage.removeItem(key);
                getRaces();
            }
        }
    }

    var countRaces = function() {
        var key;
        var count = 0;
        for (var i = localStorage.length - 1; i >= 0; i--) {
            key = localStorage.key(i);
            if ((/^race./).test(key)) {
                count++;
            }
        }
        return count;
    }

	$scope.removeRace = function(raceId) {
		localStorage.removeItem('race.' + raceId);
        renumberRaces();
		getRaces();
	}

    var renumberRaces = function() {
        $log.info('Renumbering...');
        var key;
        var index = 1;
        for (var i = 0; i < localStorage.length; i++) {
            key = localStorage.key(i);
            $log.info(key);
            if ((/^race./).test(key)) {
                $log.info('Matches. Setting race.' + index + ' = ' + key);
                if ('race.' + index != key) {
                    localStorage.setItem('race.' + index, localStorage.getItem(key));
                    localStorage.removeItem(key);
                }
                index++;
            }
        }
    }

	var getRaces = function() {
		var races = [];
		for (key in localStorage) {
			if ((/^race./).test(key)) {
				var race = JSON.parse(localStorage.getItem(key));
				races.push(race);
			}
		}

		$log.info(races);
		$scope.races = races;
	}

	getRaces();
});

ponyupApp.controller('raceInfoCtrl', function($scope, $log, $routeParams) {
    $scope.raceId = $routeParams.raceId;
    $scope.race = JSON.parse(localStorage.getItem('race.' + $scope.raceId));

    $scope.saveInfo = function() {
        $scope.race.id = $scope.raceId;

        localStorage.setItem('race.' + $scope.raceId, JSON.stringify($scope.race));
        window.location.href = '#/intro';
    }
});

ponyupApp.controller('horsesCtrl', function($scope, $log, $routeParams, $window) {
	$scope.raceId = $routeParams.raceId;
    $scope.race = JSON.parse(localStorage.getItem('race.' + $scope.raceId));
    if (!$scope.race.horses) {
        $scope.race.horses = [
            {
                id: 1
            }
        ];
    }
    $scope.horses = $scope.race.horses;

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
        if ($scope.mainForm.$valid) {
            localStorage.setItem('race.' + $scope.raceId, JSON.stringify($scope.race));
            $scope.success = true;
            $window.scrollTo(0,0);
        }
	}

	$scope.modifyHistory = function(horseId) {
		localStorage.setItem('race.' + $scope.raceId, JSON.stringify($scope.race));
		window.location.href = "#/races/" + $scope.raceId + "/" + horseId;
	}

    $scope.imageCapture = function(horseId) {
        localStorage.setItem('race.' + $scope.raceId, JSON.stringify($scope.race));
        window.location.href = "#/imageCap/" + $scope.raceId + "/" + horseId;
    }

	$scope.calculate = function() {
		var horses = $scope.horses;
		for (var i=0; i<horses.length; i++) {
			var curHorse = horses[i];
			calcHorseAvg(curHorse);
		}
		localStorage.setItem('race.' + $scope.raceId, JSON.stringify($scope.race));
		window.location.href = "#/results/" + $scope.raceId;
	}
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

    $scope.raceId = $routeParams.raceId;
    $scope.horseId = $routeParams.horseId;
    $scope.race = JSON.parse(localStorage.getItem('race.' + $scope.raceId));
    $scope.horses = $scope.race.horses;
    var selectedHorse = getHorseById($scope.horseId);
	if (!selectedHorse.history) {
        selectedHorse.history = [
            {
                id: 1
            }
        ]
    }
    $scope.selectedHorse = selectedHorse;

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

	$scope.addRace = function() {
		selectedHorse.history.push({id: $scope.selectedHorse.history.length + 1});
	}

	$scope.save = function() {
        if ($scope.mainForm.$valid) {
            localStorage.setItem('race.' + $scope.raceId, JSON.stringify($scope.race));
            window.location.href = "#/horses/" + $scope.raceId;
        }
	}

});

ponyupApp.controller('resultCtrl', function($scope, $log, $routeParams) {
    $scope.race = JSON.parse(localStorage.getItem('race.' + $routeParams.raceId));
    $scope.horses = $scope.race.horses;
    if (!$scope.horses) {
        $scope.error = true;
        $scope.errorMsg = 'The results for this race have not yet been calculated. Do so by clicking the Pick the Winners button on the Edit Horses page.';
    }
});

ponyupApp.controller('imageCapCtrl', function($scope, $q, $log, $routeParams) {
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
    };

    var getHorseById = function(horseId) {
		var horses = $scope.horses;
		for (var i = 0; i < horses.length; i++) {
			if (horses[i].id == horseId) {
				return $scope.horses[i];
			}
		}
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
    };

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
    };

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
    };

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
    };

    $scope.retake = function() {
        $scope.pictureTaken = false;
    };

    $scope.reupload = function() {
        $scope.pictureUploaded = false;
    };

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
            .update();

            window.texture = texture;
            window.fxCanvas = fxCanvas;

            $(img)
            .attr('src', fxCanvas.toDataURL());

            $scope.pictureUploaded = true;
            $scope.uploading = false;
        })
    };

    $scope.adjustBC = function() {
        $log.info("adjusting BC");
        var img = document.querySelector('#step2 img');
        var brightness = $scope.brightness / 100;
        var contrast = $scope.contrast / 100;

        fxCanvas.draw(texture)
        .hueSaturation(-1, -1)
        .unsharpMask(20, 2)
        .brightnessContrast(brightness, contrast)
        .update();

        img.src = fxCanvas.toDataURL();
    }

    $scope.acceptPicture = function() {
        $('.container > img').cropper({});
        $scope.pictureAccepted = true;
        $scope.horseNameSelect = true;
    };

    $scope.cropper = function(method, value) {
        $('.container > img').cropper(method, value);
    }

    $scope.crop = function() {
        var canvas = $('.container > img').cropper('getCroppedCanvas');
        var img = document.querySelector('#cropped');
        $(img).attr('src', canvas.toDataURL());
        $scope.done = true;
    }

    $scope.recognize = function() {
        var img = document.querySelector('#cropped');
        var canvas = document.querySelector('#croppedCanvas');
        canvas.width = $(img).width();
        canvas.height = $(img).height();

        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        $scope.ocrtxt = OCRAD(canvas);
    }

    $scope.setField = function() {
        $scope.ocrtxt = $scope.ocrtxt.trim();
        $scope.error = false;
        switch($scope.fieldSelect) {
            case 'horse name':
                $scope.selectedHorse.name = $scope.ocrtxt;
                $scope.success = true;
                break;
            case 'horse number':
                if (isNaN(parseInt($scope.ocrtxt))) {
                    $scope.error = true;
                    $scope.success = false;
                    $scope.errorMsg = 'Error setting horse number: ' + $scope.ocrtxt + ' is not a number.';
                } else {
                    $scope.selectedHorse.id = parseInt($scope.ocrtxt);
                    $scope.success = true;
                }
                break;
            case 'jockey':
                $scope.selectedHorse.jockey = $scope.ocrtxt;
                $scope.success = true;
                break;
            case 'win percent':
                $scope.ocrtxt = $scope.ocrtxt.replace('O', '0');
                if (isNaN(parseFloat($scope.ocrtxt))) {
                    $scope.error = true;
                    $scope.success = false;
                    $scope.errorMsg = 'Error setting win percent: ' + $scope.ocrtxt + ' is not a number.';
                } else {
                    $scope.selectedHorse.winPct = parseFloat($scope.ocrtxt);
                    $scope.success = true;
                }
                break;
        }

        if (!$scope.error) {
            localStorage.setItem('horses.' + $scope.raceId, JSON.stringify($scope.horses));
            $scope.successMsg = 'Successfully set ' + $scope.fieldSelect + ' to ' + $scope.ocrtxt;
        }
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
    };

    $scope.brightness = 20;
    $scope.contrast = 90;

    $scope.raceId = $routeParams.raceId;
	$scope.race = JSON.parse(localStorage.getItem('race.' + $routeParams.raceId));
    $scope.horses = $scope.race.horses;
	$scope.horseId = $routeParams.horseId;
	$scope.selectedHorse = getHorseById($scope.horseId);

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
