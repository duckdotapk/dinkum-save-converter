//
// Imports
//

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { DotNetBinaryReader } from "./classes/DotNetBinaryReader.js";

//
// Functions
//

/**
 * Gets the path to the Dinkum saved games folder.
 * 
 * @returns {String}
 */
function getDinkumSaveDirectory()
{
	// TODO: Don't hardcode this to Slot0
	switch (process.platform)
	{
		case "win32":
			return path.join(os.homedir(), "AppData", "LocalLow", "James Bendon", "Dinkum", "Slot0");

		case "linux":
			return path.join(os.homedir(), 
				".local", "share", "Steam", "steamapps", "compatdata", "1062520", "pfx", "drive_c", "users",
				"steamuser", "AppData", "LocalLow", "James Bendon", "Dinkum", "Slot0");
	}
}

//
// Application
//

const saveDir = process.argv[2] ?? getDinkumSaveDirectory();

const saveDirEntries = fs.readdirSync(saveDir, 
	{ 
		withFileTypes: true,
	})
	.filter((entry) =>
	{
		return entry.name.endsWith(".dat") &&
			entry.name != "versionCheck.dat";
	});

const dumpDir = path.join(saveDir, "_JSON_DUMP");

fs.mkdirSync(dumpDir,
	{
		recursive: true,
	});

for (const entry of saveDirEntries)
{
	if (entry.isFile())
	{
		try
		{
			const data = await DotNetBinaryReader.readFile(path.join(saveDir, entry.name));

			fs.writeFileSync(path.join(dumpDir, entry.name + ".json"), 
				JSON.stringify(data, 
					(key, value) =>
					{
						if(typeof(value) == "bigint")
						{
							return value.toString();
						}
		
						return value;
					}, 
					"\t"));
		}
		catch(error)
		{
			console.log(error);
		}
	}
	else if (entry.isDirectory())
	{
		console.log("SKIPPING DIRECTORY FOR NOW:", entry.name);
		// TODO: Recursion
	}
}