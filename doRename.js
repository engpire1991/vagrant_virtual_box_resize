'use strict';

if (process.argv.length < 3){
	console.error(`one parameter ( name ) must be provided`);
	process.exit(1);
}

const name = process.argv[2];

const { exec } = require('child_process');
const { readdirSync, unlinkSync} = require('fs');

const folder = `./${name}/`;

const prefix = 'ubuntu-xenial-16.04-cloudimg';
const origVmdk = `${prefix}.vmdk`;
const origDriver = `${prefix}-configdrive.vmdk`;

let files;
try {
	files = readdirSync(folder);
} catch(err) {
	if (err.code == 'ENOENT'){
		console.error(`dirrectory ./${name} does not exist`);
		process.exit(1);
	}
	console.error(err);
	process.exit(1);
}

function removeFromList(list, element){
	const index = list.indexOf(element);
	if (index != -1){
		return list.splice(index, 1);
	}
	return null;
}

function doExec(command){
	return new Promise((resolve, reject) => {
		exec(command, (err, stdout, stderr) => {
			if (err) {
				console.log(`got error while executing '${command}'. Error: `, err);
				return reject();
			}
			return resolve(stdout);
		});
	});
}


async function doRemoveDriver(driverName){
	const path = `${folder}${driverName}`;
	try {
		// remove driver from virtual box. This also removes it from our HDD
		await doExec(`VBoxManage closemedium disk ${path} --delete`);

		// remove driver from file list, since no longer exists
		removeFromList(files, driverName);
	} catch(err) {
		console.error(`failed to remove ${path}. Error: `, err);
	}
}

async function doAttach(driverName, port = 0, device = 0){
	await doExec(`VBoxManage storageattach ${name} --storagectl "SCSI" --port ${port} --device ${device} --type hdd --medium ${folder}${driverName}`);
}

async function doClone(fromName, toName, format = 'vmdk'){
	const fromPath = `${folder}${fromName}`;
	const toPath = `${folder}${toName}`;
	// check if input exists
	if (files.indexOf(fromName) == -1){
		throw `"${fromPath}" doesn't exist, skipping cloning`;
	}

	// check if result vmdk doesn't already exist
	if (files.indexOf(toName) != -1){
		console.log(`"${toPath}" already exists, skipping cloning`);
		return false;
	}

	// clone the driver
	await doExec(`VBoxManage clonemedium "${fromPath}" "${toPath}" --format ${format}`);

	// add new file to the file list, since it now exists
	files.push(toName);
	return true;
}

async function cloneHdd(){
	const vmdk = `${name}.vmdk`;
	const clone = 'clone.vdi';

	// check if end result doesn't already exist
	if (files.indexOf(vmdk) != -1){
		console.log(`"${folder}${vmdk}" already exists, skipping cloning`);
		return;
	}

	// create a vdi clone so that we can resize
	await doClone(origVmdk, clone, 'vdi');
	
	// do the resize
	await doExec(`VBoxManage modifymedium "${folder}${clone}" --resize 101200`);
	
	// now clone to vmdk with hte new name
	await doClone(clone, vmdk);

	// attach the new vmdk to the virtual machine
	await doAttach(vmdk, 0, 0);

	// remove the clone vdi
	doRemoveDriver(clone);

	// remove the orig vmdk
	doRemoveDriver(origVmdk);
}

async function cloneDriver(){
	const driver = `${name}-driver.vmdk`;
	
	if (files.indexOf(driver) != -1){
		console.log(`"${folder}${driver}" already exists, skipping cloning`);
		return;
	}
	
	// clone to vmdk with the new name
	await doClone(origDriver, driver);
	
	// attach the new vmdk to the virtual machine
	await doAttach(driver, 1, 0);

	// remove the orig driver
	doRemoveDriver(origDriver);
}

async function handle(){
	try {
		// rename ubuntu-xenial-16.04-cloudimg.vmdk if exists
		if (files.indexOf(origVmdk) != -1){
			await cloneHdd();
		}
		// rename ubuntu-xenial-16.04-cloudimg-configdrive.vmdk if exists
		if (files.indexOf(origDriver) != -1){
			await cloneDriver();
		}
	} catch(err) {
		if (err) {
			console.error(err);
		}
		process.exit(1);
	}
}

handle();