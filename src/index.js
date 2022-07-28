//
// Imports
//

import fs from "node:fs";

import { DotNetBinaryReader } from "./classes/DotNetBinaryReader.js";


//
// Stuff
//

const data = await DotNetBinaryReader.readFile("/home/loren/Dropbox/Private/Saved Games 2/Dinkum/Slot0/playerInfo.dat");

fs.writeFileSync("/home/loren/Dropbox/Private/Saved Games 2/Dinkum/Slot0/playerInfo.raw.json", 
	JSON.stringify(data, (key, value) =>
	{
		if(typeof(value) == "bigint")
		{
			return value.toString();
		}

		return value;
	}, "\t"));