//
// Imports
//

import fs from "node:fs";

//
// Functions
//

function readString(view, pos) 
{
	let length = view.getUint8(pos);
	
	pos++;

	let buffer = [];

	for (let i = 0; i < length; i++) 
	{
		buffer.push(view.getUint8(pos));
		pos++;
	}

	return String.fromCharCode.apply(String, buffer);
}

//
// Stuff
//

/**
 * A class for reading binary files.
 */
class BinaryReader
{
	/**
	 * @type {Number}
	 */
	position = 1;

	/** 
	 * @type {DataView} 
	 */
	view;

	/**
	 * @type {Number}
	 */
	recordId;

	/**
	 * Constructs a new BinaryReader.
	 * 
	 * @param {ArrayBuffer} arrayBuffer 
	 */
	constructor(arrayBuffer)
	{
		this.view = new DataView(arrayBuffer);
	}

	/**
	 * Reads a string's length from the file and then the string itself.
	 * 
	 * @returns {String}
	 */
	readString() 
	{
		let length = this.view.getUint8(this.position);

		this.position += 1;

		let buffer = [];

		for (let i = 0; i < length; i++) 
		{
			buffer.push(this.view.getUint8(this.position));

			this.position += 1;
		}
	
		return String.fromCharCode.apply(String, buffer);
	}

	/**
	 * Reads an unsigned 32-bit integer from the file.
	 * 
	 * @returns {Number}
	 */
	readUInt32()
	{
		const int = this.view.getUint32(this.position, true);

		this.position += 4;

		return int;
	}
}

/**
 * @param {Number} type The type of primitive.
 * @param {DataView} view A data view to read from.
 * @param {Number} pos The position to start at in the data view.
 * @returns {Array<Number|String, DataView>}
 */
function readPrimitive(type, view, pos)
{
	let value;

	switch (type)
	{
		case 1: // Boolean
		case 2: // Byte
			value = view.getUint8(pos);
			pos += 1;

			break;

		case 3: // Char
			value = String.fromCharCode(view.getUint8(pos));
			pos += 1;

			break;

		case 4: // Unused
			throw new Error("Invalid primitive type:", type);

		case 5: // Decimal
			value = readString(view, pos);
			pos += value.value.length + 1;

			break;

		case 6: // Double
			value = view.getFloat64(pos, true);
			pos += 8;

			break;

		case 7: // Short (Int16)
			value = view.getInt16(pos, true);
			pos += 2;
			break;
		
		case 8: // Integer (Int32)
			value = view.getInt32(pos, true);
			pos += 4;

			break;

		case 9: // Long (Int64)
			value = view.getBigInt64(pos, true);
			pos += 8;

			break;
		
		case 10: // Signed Byte
			value = view.getInt8(pos, true);
			pos += 1;

			break;

		case 11: // Single
			value = view.getFloat32(pos, true);
			pos += 4;
			break;

		case 12: // Timespan						
		case 13: // Datetime
			value = view.getBigInt64(pos, true);
			pos += 8;

			break;

		case 14: // UShort (UInt16)
			value = view.getUint16(pos, true);
			pos += 2;
			break;

		case 15: // UInteger (UInt32)
			value = view.getUint32(pos, true);
			pos += 4;

			break;

		case 16: // ULong (UInt64)
			value = view.getUint64(pos, true);
			pos += 8;

			break;

		case 17: // Null
			break;

		case 18: // String
			value.value = readString(view, pos);
			pos += value.value.length + 1;

			break;

		default:
			throw new Error("Invalid primitive type:", type);
	}

	return [ value, pos ];
}

/**
 * @typedef {Object} SerializationHeader
 * @property {Number} rootId
 * @property {Number} headerId
 * @property {Number} majorVersion
 * @property {Number} minorVersion
 */
function readBinaryFormatterData(path)
{
	const nodeBuffer = fs.readFileSync(path);

	const arrayBuffer = new Uint8Array(nodeBuffer).buffer;

	const binaryReader = new BinaryReader(arrayBuffer);

	const view = new DataView(arrayBuffer);
	
	let pos = 1;
	
	let recordId = view.getUint8();
	
	const data = {};
	
	while(recordId != 0x0B)
	{
		if (recordId == 0x00)
		{
			data.serializationHeader = {};
	
			data.serializationHeader.rootId = view.getUint32(pos, true);
			pos += 4;
	
			data.serializationHeader.headerId = view.getUint32(pos, true);
			pos += 4;
	
			data.serializationHeader.majorVersion = view.getUint32(pos, true);
			pos += 4;
	
			data.serializationHeader.minorVersion = view.getUint32(pos, true);
			pos += 4;
		}
		else if (recordId == 0x0C) 
		{
			data.binaryLibrary = {};
	
			data.binaryLibrary.libraryId = view.getUint32(pos, true);
			pos += 4;
	
			data.binaryLibrary.libraryName = readString(view, pos);
			pos += data.binaryLibrary.libraryName.length + 1;
		}
		else if (recordId == 0x05) 
		{
			//
			// Object Details
			//
	
			data.class = {};
	
			data.class.objectId = view.getUint32(pos, true);
			pos += 4;
	
			data.class.name = readString(view, pos);
			pos += data.class.name.length + 1;
	
			data.class.memberCount = view.getUint32(pos, true);
			pos += 4;
	
			//
			// Get Member Names
			//
	
			data.class.memberNames = [];
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				const memberName = readString(view, pos);
				pos += memberName.length + 1;
	
				data.class.memberNames.push(memberName);
			}
	
			//
			// Get Member Types
			//
	
			data.class.memberTypes = [];
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				const type =
				{
					id: view.getUint8(pos),
					additionalInfo: undefined,
				};
	
				pos += 1;
	
				data.class.memberTypes.push(type);
			}
	
			//
			// Get Additional Type Info
			//
	
			for (let i = 0; i < data.class.memberCount; i++)
			{
				const type = data.class.memberTypes[i];
	
				switch(type.id)
				{
					case 0:
					case 7:
						type.additionalInfo = view.getUint8(pos);
						pos += 1;
	
						break;
	
					case 1:
						// No Additional Data, Do Nothing
						break;
	
					case 3:
						type.additionalInfo = readString(view, pos);
						pos += type.additionalInfo.length + 1;
	
						break;
	
					case 4:
						type.additionalInfo = {};
	
						type.additionalInfo.typeName = readString(view, pos);
						pos += type.additionalInfo.typeName.length + 1;
	
						type.additionalInfo.libraryId = view.getUint8(pos);
						pos += 4;
	
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
			data.class.libraryId = view.getUint32(pos, true);
			pos += 4;
	
			data.class.memberValues = [];
	
			for(let i = 0; i < data.class.memberCount; i++)
			{
				const type = data.class.memberTypes[i];
	
				const value = {};
	
				switch (type.id)
				{
					case 0:
					{
						const [ value2, newPos ] = readPrimitive(type.additionalInfo, view, pos);

						value.value = value2;
						pos = newPos;
	
						break;
					}
	
					case 1:
					{
						value.recordType = view.getUint8(pos);
						pos += 1;
	
						if (value.recordType != 6)
						{
							throw new Error("Unknown string record type:", value.recordType);
						}
	
						value.objectId = view.getUint32(pos, true);
						pos += 4;
	
						value.value = readString(view, pos);
						pos += value.value.length + 1;
	
						break;
					}
	
					case 7:
					{
						value.recordType = view.getUint8(pos);
						pos += 1;
	
						value.index = view.getUint32(pos, true);
						pos += 4;
	
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
	
				value.recordType = view.getUint8(pos);
				pos += 1;
	
				// Note: Skip over padding
				while (value.recordType != 15)
				{
					value.recordType = view.getUint8(pos);
					pos += 1;
				}
	
				value.id = view.getUint32(pos, true);
				pos += 4;
	
				value.length = view.getUint32(pos, true);
				pos += 4;
	
				value.primitiveType = view.getUint8(pos);
				pos += 1;
	
				value.value = [];
	
				for(let i = 0; i < value.length; i++)
				{
					const [ value2, newPos ] = readPrimitive(value.primitiveType, view, pos);

					value.value[i] = value2;
					pos = newPos;
				}
			}
	
			break;
		}
		else 
		{
			throw new Error("Unexpected record ID:", recordId);
		}
	
		recordId = view.getUint8(pos);
		pos += 1;
	}

	return data;
}

const data = readBinaryFormatterData("C:\\Users\\Loren\\Dropbox\\Private\\Saved Games 2\\Dinkum\\Slot0\\playerInfo.dat");

fs.writeFileSync("C:\\Users\\Loren\\Desktop\\playerInfo.raw.json", 
	JSON.stringify(data, (key, value) =>
	{
		if(typeof(value) == "bigint")
		{
			return value.toString();
		}

		return value;
	}, "\t"));