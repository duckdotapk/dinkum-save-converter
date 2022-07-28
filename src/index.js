//
// Imports
//

import fs from "node:fs";

import { DotNetBinaryReader } from "./classes/DotNetBinaryReader.js";


//
// Stuff
//

/**
 * @typedef {Object} BinaryFormatterData
 * @property {SerializationHeader} serializationHeader
 * @property {BinaryLibrary} binaryLibrary
 * @property {SerializedClass} class
 */

/**
 * @typedef {Object} SerializationHeader
 * @property {Number} rootId
 * @property {Number} headerId
 * @property {Number} majorVersion
 * @property {Number} minorVersion
 */

/**
 * @typedef {Object} BinaryLibrary
 * @property {Number} id
 * @property {String} name
 */

/**
 * @typedef {Object} SerializedClass
 * @property {Number} objectId
 * @property {String} name The name of the class that was serialized.
 * @property {Number} memberCount The count of members in this class.
 * @property {Array<String>} memberNames An array of all of the names of this class' members.
 * @property {Array<SerializedClassMemberType>} memberTypes Type information for the class' members.
 * @property {Array<SerializedClassMemberValue>} memberValues The values for each member.
 */

/**
 * @typedef {Object} SerializedClassMemberType
 * @property {Number} id
 * @property {Number|SerializedClassMemberTypeDetails} additionalInfo
 */

/**
 * @typedef {Object} SerializedClassMemberTypeDetails
 * @property {String} name
 * @property {Number} libraryId
 */

/**
 * @typedef {Object} SerializedClassMemberValue
 */

/**
 * Reads a data file created with a .NET BinaryFormatter.
 * 
 * @param {String} path The path to the file.
 * @returns {BinaryFormatterData}
 */
function readBinaryFormatterData(path)
{
	const nodeBuffer = fs.readFileSync(path);

	const arrayBuffer = new Uint8Array(nodeBuffer).buffer;

	const binaryReader = new DotNetBinaryReader(arrayBuffer);
	
	let recordId = 0x00;
	
	/** @type {BinaryFormatterData} */
	const data = {};
	
	// Note: 0B signifies the end of one of these files
	while(recordId != 0x0B)
	{
		if (recordId == 0x00)
		{
			data.serializationHeader = 
			{
				rootId: binaryReader.readUInt32(),
				headerId: binaryReader.readUInt32(),
				majorVersion: binaryReader.readUInt32(),
				minorVersion: binaryReader.readUInt32(),
			};
		}
		else if (recordId == 0x0C) 
		{
			data.binaryLibrary =
			{
				id: binaryReader.readUInt32(),
				name: binaryReader.readString(),
			};
		}
		else if (recordId == 0x05) 
		{
			//
			// Object Details
			//
	
			/** @type {SerializedClass} */
			data.class = 
			{
				objectId: binaryReader.readUInt32(),
				name: binaryReader.readString(),
				memberCount: binaryReader.readUInt32(),
			};
	
			//
			// Get Member Names
			//
	
			data.class.memberNames = [];
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				data.class.memberNames.push(binaryReader.readString());
			}
	
			//
			// Get Member Types
			//
	
			data.class.memberTypes = [];
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				/** @type {SerializedClassMemberType} */
				const type =
				{
					id: binaryReader.readUInt8(),
					additionalInfo: undefined,
				};
	
				data.class.memberTypes.push(type);
			}
	
			//
			// Get Additional Type Info
			//
	
			for (let i = 0; i < data.class.memberCount; i++)
			{
				/** @type {SerializedClassMemberType} */
				const type = data.class.memberTypes[i];
	
				switch(type.id)
				{
					case 0:
					case 7:
						type.additionalInfo = binaryReader.readUInt8();
	
						break;
	
					case 1:
						// No Additional Data, Do Nothing
						break;
	
					case 3:
						type.additionalInfo = binaryReader.readString();	

						break;
	
					case 4:
						type.additionalInfo = 
						{
							name: binaryReader.readString(),
							libraryId: binaryReader.readUInt8(),
						};
	
						break;
	
					default:
						throw new Error("Unexpected member type:", type.id);
				}
			}
	
			//
			// Get Member Values
			//
	
			// NOTE: If this isn't 2, the file is fucked
			//	Should probably do error handling here
			//	Josh said this is an identifier that explains how to read the rest of the file
			data.class.libraryId = binaryReader.readUInt32();
	
			data.class.memberValues = [];
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				const type = data.class.memberTypes[i];
	
				const value = {};
	
				switch (type.id)
				{
					case 0:
						value.value = binaryReader.readPrimitive(type.additionalInfo);	
						break;
	
					case 1:
					{
						value.recordType = binaryReader.readUInt8();
	
						if (value.recordType != 6)
						{
							throw new Error("Unknown string record type:", value.recordType);
						}

						value.objectId = binaryReader.readUInt32();

						value.value = binaryReader.readString();
	
						break;
					}
	
					case 7:
					{
						value.recordType = binaryReader.readUInt8();

						value.index = binaryReader.readUInt32();
	
						break;
					}
	
					default:
					{
						throw new Error("Unknown member type:", type.id);
					}
				}
	
				data.class.memberValues.push(value);
			}
	
			//
			// Get Array Member Values
			//
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				const type = data.class.memberTypes[i];
	
				if (type.id != 7)
				{
					continue;
				}
	
				const value = data.class.memberValues[i];

				value.recordType = binaryReader.readUInt8();
	
				// Note: Skip over padding
				while (value.recordType == 0)
				{
					value.recordType = binaryReader.readUInt8();
				}
	
				value.id = binaryReader.readUInt32();

				value.length = binaryReader.readUInt32();

				value.primitiveType = binaryReader.readUInt8();
	
				value.value = [];
	
				for(let i = 0; i < value.length; i++)
				{
					value.value.push(binaryReader.readPrimitive(value.primitiveType));
				}
			}
	
			break;
		}
		else 
		{
			throw new Error("Unexpected record ID:", recordId);
		}
	
		recordId = binaryReader.readUInt8();		
	}

	return data;
}

const data = readBinaryFormatterData("/home/loren/Dropbox/Private/Saved Games 2/Dinkum/Slot0/playerInfo.dat");

fs.writeFileSync("/home/loren/Dropbox/Private/Saved Games 2/Dinkum/Slot0/playerInfo.raw.json", 
	JSON.stringify(data, (key, value) =>
	{
		if(typeof(value) == "bigint")
		{
			return value.toString();
		}

		return value;
	}, "\t"));