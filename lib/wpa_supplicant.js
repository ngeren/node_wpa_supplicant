var sys = require('sys')
var fs = require('fs');
var exec = require('child_process').exec;

var self = module.exports = {
  configureNetworkAdapter: function (values, success, error) {
		self.updateWpaConfig(values, function(){
			console.log("Successfully updated WPA config!");
			console.log("Restarting network adatper (ifdown/ifup)");
			self.restartNetworkAdapter(function(){
				console.log("Successfully restarted network adapter. Calling success callback.");
				success();
			},
			function(){
				console.log("Error restting network adapter. Calling error callback.");
				error();
			});	
		}, function(){
			console.log("Error updating config! Calling error callback.");
			error();
		});
  },
  updateWpaConfig: function (values, success, error) {
		var wpa_supplicant_file = "/etc/wpa_supplicant/wpa_supplicant.conf";	
		self.backupWpaConfig(function(backupFile){	
			self.createWpaConfig(values, 
				function(file){				
					console.log("File (" + file + ") successfully created.");				
					fs.rename(file, wpa_supplicant_file, function (err) {
						if (err) { error(err); return false; }
					  console.log('Renamed complete. Calling success callback.');
						success();
					});
				}, 
				function(file, error){
					console.log("Error occurred creating file (" + file + ")");
					console.log(error);
					error(error);
				}
			);		
		}, function(err){
			error(err);
		});
  },
	backupWpaConfig: function (success, error) { 
		var timestamp = Number(new Date());
		var wpa_supplicant_file = "/etc/wpa_supplicant/wpa_supplicant.conf";
		var file = wpa_supplicant_file + ".backup-" + timestamp; 	
		console.log("Backing up (" + wpa_supplicant_file + ") to (" + file + ").");
		copyFile(wpa_supplicant_file, file, function(err){
			if(err) {
				console.log("Error creating copy/backup.");
				error(err);
			} else {
				console.log("Backup created. Calling success.");
				success(file);
			}
		});		
	},	
	createWpaConfig: function (values, success, error) {
		var timestamp = Number(new Date());
		var wpa_supplicant_file = "/etc/wpa_supplicant/wpa_supplicant.conf";	
		var file = wpa_supplicant_file + ".new-" + timestamp;
		console.log("Creating new file (" + file + ")");	
		console.log("Writing settings/values: " + JSON.stringify(values));
		// create new supplicant file
		var contents = "";
		contents += "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\n";
		contents += "update_config=1\n\n";
		contents += "network={\n";
		contents += "\tssid=\"" + values.ssid + "\"\n";
		if (values.passkey != null && values.passkey.length > 0) {
			contents += "\tpsk=\"" + values.passkey + "\"\n";
		}
		contents += "}\n";
		fs.writeFile(file, contents, function(err) {
			if(err) {
				console.log("Error writing contents to new wpa supplicant file: " + fname)
				console.log(err);
				error(file, err);
				return false;
			}
	    console.log("The file was saved!");
			success(file);
		});	
	},
	restartNetworkAdapter: function (successCb, errorCb) {
		function ifup(error, stdout, stderr) {
			console.log("(ifup) ERROR: " + error);
			console.log("(ifup) STDERR: " + stderr);
			console.log("(ifup) STDOUT: " + stdout);		
			if (stdout != null) {
				console.log("(ifup) checking for assigned ip address");
				var regex = /[\s\s]*?bound to (\d+\.\d+\.\d+\.\d+)[\s\s]*?/ig;
				if (stderr.match(regex)) {
					console.log("(ifup) ip address regex matched stdout.");
					successCb();
					return true;
				} else {
					console.log("(ifup) no ip address found in stdout.");
					errorCb();
					return false;
				}
			}
			console.log("(ifup) fallback. Maybe we should error here?");
			success();
		}	
		function ifdown(error, stdout, stderr) {
			console.log("(ifdown) ERROR: " + error);
			console.log("(ifdown) STDERR: " + stderr);
			console.log("(ifdown) STDOUT: " + stdout);		
			console.log("Calling ifup wlan0");
			exec("ifup wlan0", ifup);
		}
		console.log("Calling ifdown wlan0");
		exec("ifdown wlan0", ifdown);		
	}
};

function copyFile(source, target, cb) {
  var cbCalled = false;
  var rd = fs.createReadStream(source);
  rd.on("error", done);
  var wr = fs.createWriteStream(target);
  wr.on("error", done);
  wr.on("close", function(ex) { done(); });
  rd.pipe(wr);
  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
