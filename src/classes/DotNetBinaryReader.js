//
// Imports
//

import assert from "node:assert";

import { BinaryReader } from "./BinaryReader.js";

//
// Type Definitions
//


/**
 * @typedef {Object} SerializationHeaderRecord
 * @property {Number} RecordType
 * @property {Number} RootId
 * @property {Number} HeaderId
 * @property {Number} MajorVersion
 * @property {Number} MinorVersion
 */

/**
 * @property {Number} RecordType
 * @typedef {Object} BinaryLibrary
 * @property {Number} LibraryId
 * @property {String} LibraryName
 */

/**
 * @typedef {Object} ClassWithMembersAndTypes
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

//
// Exports
//

/**
 * A binary reader with additional functions specific to Microsoft .NET BinaryFormatter files.
 */
export class DotNetBinaryReader extends BinaryReader
{
	/**
	 * An enumeration containg types of binary arrays.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A113%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C674%2C0%5D
	 */
	static BinaryArrayTypeEnumeration =
		{
			Single: 0,
			Jagged: 1,
			Rectangular: 2,
			SingleOffset: 3,
			JaggedOffset: 4,
			RectangularOffset: 5,
		};

	/**
	 * An enumeration containing valid record types.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A72%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C583%2C0%5D
	 */
	static RecordTypeEnumeration =
		{
			SerializedStreamHeader: 0,
			ClassWithId: 1,
			SystemClassWithMembers: 2,
			ClassWithMembers: 3,
			SystemClassWithMembersAndTypes: 4,
			ClassWithMembersAndTypes: 5,
			BinaryObjectString: 6,
			BinaryArray: 7,
			MemberPrimitiveTyped: 8,
			MemberReference: 9,
			ObjectNull: 10,
			MessageEnd: 11,
			BinaryLibrary: 12,
			ObjectNullMultiple256: 13,
			ObjectNullMultiple: 14,
			ArraySinglePrimitive: 15,
			ArraySingleObject: 16,
			ArraySingleString: 17,
			MethodCall: 21,
			MethodReturn: 22,
		};

	/**
	 * An enumeration containing valid binary types.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A75%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C434%2C0%5D
	 */
	static BinaryTypeEnumeration =
		{
			Primitive: 0,
			String: 1,
			Object: 2,
			SystemClass: 3,
			Class: 4,
			ObjectArray: 5,
			StringArray: 6,
			PrimitiveArray: 7,
		};

	/**
	 * An enumeration containing valid primitive types.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A77%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C625%2C0%5D
	 */
	static PrimitiveTypeEnumeration =
		{
			Boolean: 1,
			Byte: 2,
			Char: 3,
			Unused: 4,
			Decimal: 5,
			Double: 6,
			Int16: 7,
			Int32: 8,
			Int64: 9,
			SByte: 10,
			Single: 11,
			TimeSpan: 12,
			DateTime: 13,
			UInt16: 14,
			UInt32: 15,
			UInt64: 16,
			Null: 17,
			String: 18,
		};

	/**
	 * @type {import("node:fs")}
	 */
	static #fs = null;

	/**
	 * Reads a Microsoft .NET BinaryFormatter file from the disk.
	 * 
	 * Only works in Node.js.
	 * 
	 * @param {String} path The path to the file.
	 * @author Loren Goodwin
	 */
	static async readFile(path)
	{
		console.log(`[DotNetBinaryReader] Reading from file: ${ path }`);

		if (DotNetBinaryReader.#fs == null)
		{
			DotNetBinaryReader.#fs = await import("node:fs");
		}

		const fs = DotNetBinaryReader.#fs;

		const nodeBuffer = await fs.promises.readFile(path);

		const arrayBuffer = new Uint8Array(nodeBuffer).buffer;

		const binaryReader = new DotNetBinaryReader(arrayBuffer);

		return binaryReader.read();
	}

	/**
	 * Parses the given ArrayBuffer as a serialization stream created with a Microsoft .NET BinaryFormatter.
	 * 
	 * @param {ArrayBuffer} serializationStream
	 * @returns {BinaryFormatterData}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	read()
	{
		/**
		 * An array of all records in the serialization stream.
		 * 
		 * @type {Array}
		 */
		const records = [];
		
		// eslint-disable-next-line no-constant-condition
		while(true)
		{
			let recordType = this.readInt8();

			switch (recordType)
			{
				case DotNetBinaryReader.RecordTypeEnumeration.SerializedStreamHeader:
					records.push(this.#readSerializationHeader(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.ClassWithId:
					records.push(this.#readClassWithId(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.SystemClassWithMembers:			
					throw new Error("Record type not implemented:", recordType);	

				case DotNetBinaryReader.RecordTypeEnumeration.ClassWithMembers:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.SystemClassWithMembersAndTypes:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ClassWithMembersAndTypes:
					records.push(this.#readClassWithMembersAndTypes(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.BinaryObjectString:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.BinaryArray:
					records.push(this.#readBinaryArray(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.MemberPrimitiveTyped:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MemberReference:
					records.push(this.#readMemberReference(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.ObjectNull:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MessageEnd:
					console.log(`[DotNetBinaryReader] Reading MessageEnd record starting at position ${ this.position }`);
					return records;

				case DotNetBinaryReader.RecordTypeEnumeration.BinaryLibrary:
					records.push(this.#readBinaryLibrary(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.ObjectNullMultiple256:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ObjectNullMultiple:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ArraySinglePrimitive:
					records.push(this.#readArraySinglePrimitive(records));
					break;

				case DotNetBinaryReader.RecordTypeEnumeration.ArraySingleObject:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.ArraySingleString:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MethodCall:
					throw new Error("Record type not implemented:", recordType);

				case DotNetBinaryReader.RecordTypeEnumeration.MethodReturn:
					throw new Error("Record type not implemented:", recordType);

				default:
					throw new TypeError("Invalid record type:", recordType);
			}	
		}
	}

	//
	// General Functions
	//

	/**
	 * Reads an ArrayInfo structure.
	 * 
	 * @returns {ArrayInfo}
	 * @author Loren Goodwin
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A113%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C347%2C0%5D
	 */
	#readArrayInfo()
	{
		const arrayInfo = {};

		arrayInfo.ObjectId = this.readInt32();

		// TODO: Validate that ObjectId is unique from all other ObjectIds

		arrayInfo.Length = this.readInt32();

		assert(arrayInfo.Length >= 0, "ArrayInfo Length must be a positive integer.");

		return arrayInfo;
	}

	/**
	 * Reads the appropriate value type for the given BinaryTypeEnum.
	 * 
	 * @param {BinaryTypeEnum} BinaryTypeEnum
	 * @returns {*}
	 */
	#readBinaryType(BinaryTypeEnum)
	{
		switch(BinaryTypeEnum)
		{
			case DotNetBinaryReader.BinaryTypeEnumeration.Primitive:
				return this.readUInt8();

			case DotNetBinaryReader.BinaryTypeEnumeration.String:
				return null;

			case DotNetBinaryReader.BinaryTypeEnumeration.Object:
				return null;

			// TODO
			case DotNetBinaryReader.BinaryTypeEnumeration.SystemClass:
				throw new Error("SystemClass AdditionalInfos not implemented.");

			// TODO
			case DotNetBinaryReader.BinaryTypeEnumeration.Class:
			{
				const ClassTypeInfo =
				{
					TypeName: this.readString(),
					LibraryId: this.readInt32(),
				};

				// TODO: Validate that the LibraryId exists in a BinaryLibrary record read before this record

				return ClassTypeInfo;
			}

			case DotNetBinaryReader.BinaryTypeEnumeration.ObjectArray:
				return null;

			case DotNetBinaryReader.BinaryTypeEnumeration.StringArray:
				return null;

			case DotNetBinaryReader.BinaryTypeEnumeration.PrimitiveArray:
				return this.readUInt8();
		}
	}
	
	/**
	 * Reads a ClassInfo structure.
	 * 
	 * @returns {ClassInfo}
	 * @author Loren Goodwin
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A97%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C371%2C0%5D
	 */
	#readClassInfo()
	{
		const classInfo = {};

		classInfo.ObjectId = this.readUInt32();
		classInfo.Name = this.readString();
		classInfo.MemberCount = this.readUInt32();

		assert(classInfo.MemberCount > 0, `Invalid ClassWithMembersAndTypes member count: ${ classInfo.MemberCount }`);

		classInfo.MemberNames = [];

		for(let i = 0; i < classInfo.MemberCount; i++)
		{
			classInfo.MemberNames.push(this.readString());
		}

		return classInfo;
	}

	/**
	 * Reads a MemberTypeInfo structure.
	 * 
	 * @param {ClassInfo} classInfo
	 */
	#readMemberTypeInfo(classInfo)
	{
		const memberTypeInfo = {};

		memberTypeInfo.BinaryTypeEnums = [];

		for(let i = 0; i < classInfo.MemberCount; i++)
		{
			memberTypeInfo.BinaryTypeEnums.push(this.readUInt8());
		}

		memberTypeInfo.AdditionalInfos = [];

		for(let i = 0; i < classInfo.MemberCount; i++)
		{
			const binaryTypeEnum = memberTypeInfo.BinaryTypeEnums[i];

			memberTypeInfo.AdditionalInfos.push(this.#readBinaryType(binaryTypeEnum));
		}

		return memberTypeInfo;
	}
	
	/**
	 * Reads a primitive value.
	 * 
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A77%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C625%2C0%5D
	 * @param {Number} type The type of primitive to read.
	 * @returns {Number|String}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readPrimitive(type)
	{
		switch (type)
		{
			case DotNetBinaryReader.PrimitiveTypeEnumeration.Boolean:
				return this.readUInt8() != 0;

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Byte:
				return this.readUInt8();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Char:
				return this.readChar();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Unused:
				throw new Error("Invalid primitive type:", type);

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Decimal:
				return this.readString();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Double:
				return this.readFloat64();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Int16:
				return this.readInt16();
			
			case DotNetBinaryReader.PrimitiveTypeEnumeration.Int32:
				return this.readInt32();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Int64:
				return this.readInt64();

			
			case DotNetBinaryReader.PrimitiveTypeEnumeration.SByte:
				return this.readInt8();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.Single:
				return this.readFloat32();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.TimeSpan:
			case DotNetBinaryReader.PrimitiveTypeEnumeration.DateTime:
				return this.readInt64();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.UInt16:
				return this.readUInt16();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.UInt32:
				return this.readUInt32();

			case DotNetBinaryReader.PrimitiveTypeEnumeration.UInt64:
				return this.readUInt64();

			// TODO: implement this
			case DotNetBinaryReader.PrimitiveTypeEnumeration.Null:
				throw new Error("Unimplemented primitive type:", type);

			case DotNetBinaryReader.PrimitiveTypeEnumeration.String:
				return this.readString();

			default:
				throw new Error("Invalid primitive type:", type);
		}
	}

	//
	// Record Functions
	//

	/**
	 * Reads an ArraySinglePrimitive record.
	 * 
	 * @param {Array} previousRecords An array of records read before this one.
	 * @author Loren Goodwin
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A122%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C196%2C0%5D
	 */
	#readArraySinglePrimitive(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading ArraySinglePrimitive record starting at position ${ this.position }`);

		const record = {};

		record.RecordTypeEnum = DotNetBinaryReader.RecordTypeEnumeration.ArraySinglePrimitive;

		record.ArrayInfo = this.#readArrayInfo();

		record.PrimitiveTypeEnum = this.readInt8();

		assert(record.PrimitiveTypeEnum >= 0 && record.PrimitiveTypeEnum <= 16, "ArraySinglePrimitive PrimitiveTypeEnum invalid.");

		return record;
	}

	/**
	 * Reads a BinaryArray record.
	 * 
	 * @param {Array} previousRecords
	 * @returns {BinaryArray}
	 * @author Loren Goodwin
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A118%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C722%2C0%5D
	 */
	#readBinaryArray(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading BinaryArray record starting at position ${ this.position }`);

		const record = {};

		record.RecordTypeEnum = DotNetBinaryReader.RecordTypeEnumeration.BinaryArray;

		record.ObjectId = this.readInt32();

		// TODO: Verify that the ObjectId has NOT been used already in the previous records

		record.BinaryArrayTypeEnum = this.readInt8();

		assert(record.BinaryArrayTypeEnum >= 0 && record.BinaryArrayTypeEnum <= 5, `Invalid BinaryArrayTypeEnum: ${ record.BinaryArrayTypeEnum }`);

		record.Rank = this.readInt32();

		assert(record.Rank > 0, "BinaryArray Rank must be a positive integer.");

		record.Lengths = [];

		for(let i = 0; i < record.Rank; i++)
		{
			record.Lengths.push(this.readInt32());
		}

		assert(record.Rank == record.Lengths.length, "BinaryArray Rank must equal the number of Lengths.");

		if 
		(
			record.BinaryArrayTypeEnum == DotNetBinaryReader.BinaryArrayTypeEnumeration.SingleOffset ||
			record.BinaryArrayTypeEnum == DotNetBinaryReader.BinaryArrayTypeEnumeration.JaggedOffset ||
			record.BinaryArrayTypeEnum == DotNetBinaryReader.BinaryArrayTypeEnumeration.RectangularOffset
		)
		{
			record.LowerBounds = [];
	
			for(let i = 0; i < record.Rank; i++)
			{
				record.LowerBounds.push(this.readInt32());
			}
		}

		record.TypeEnum = this.readInt8();

		assert(
			(record.TypeEnum >= 0 && record.TypeEnum <= 22) && !(record.TypeEnum >= 18 && record.TypeEnum <= 20),
			"BinaryArray TypeEnum invalid.");

		record.AdditionalTypeInfo = this.#readBinaryType(record.TypeEnum);

		// TODO: READ ARRAY VALUES

		return record;
	}

	/**
	 * Reads the binary library.
	 * 
	 * @param {Array} previousRecords An array of records read before this one.
	 * @returns {BinaryLibrary}
	 * @author Loren Goodwin
	 * @author Proddy
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A140%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C394%2C0%5D
	 */
	#readBinaryLibrary(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading BinaryLibrary record starting at position ${ this.position }`);

		const record =
		{
			RecordTypeEnum: DotNetBinaryReader.RecordTypeEnumeration.BinaryLibrary,

			LibraryId: this.readUInt32(),
			LibraryName: this.readString(),
		};

		// TODO: Validate that the LibraryId has NOT already been used in any previous records.

		assert(record.LibraryId > 0, `Invalid BinaryLibrary LibraryId: ${ record.libraryId } (MUST be a positive integer)`);

		return record;
	}

	/**
	 * Reads a ClassWithId record.
	 * 
	 * @param {Array} previousRecords An array of records read before this one.
	 * @returns {ClassWithId}
	 * @author Loren Goodwin
	 */
	#readClassWithId(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading ClassWithId record starting at position ${ this.position }`);

		const record = {};

		record.RecordTypeEnum = DotNetBinaryReader.RecordTypeEnumeration.ClassWithId;

		record.ObjectId = this.readInt32();

		// TODO: Validate that this object ID is unique from all other records

		record.MetadataId = this.readInt32();

		// TODO: Validate the following
		// An INT32 value (as specified in [MS-DTYP] section 2.2.22) that references
		// one of the other Class records by its ObjectId. A SystemClassWithMembers,
		// SystemClassWithMembersAndTypes, ClassWithMembers, or ClassWithMembersAndTypes record
		// with the value of this field in its ObjectId field MUST appear earlier in the serialization stream.

		return record;
	}

	/**
	 * Reads a ClassWithMembersAndTypes record.
	 * 
	 * @param {Array} previousRecords An array of records read before this one.
	 * @returns {ClassWithMembersAndTypes}
	 * @author Loren Goodwin
	 * @author Proddy
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A103%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C479%2C0%5D
	 */
	#readClassWithMembersAndTypes(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading ClassWithMembersAndTypes record starting at position ${ this.position }`);

		const record = {};

		//
		// RecordTypeEnum
		//

		record.RecordTypeEnum = DotNetBinaryReader.RecordTypeEnumeration.ClassWithMembersAndTypes;

		//
		// ClassInfo
		//

		record.ClassInfo = this.#readClassInfo();

		//
		// MemberTypeInfo
		//

		record.MemberTypeInfo = this.#readMemberTypeInfo(record.ClassInfo);

		//
		// Library ID
		//

		record.LibraryId = this.readUInt32();

		// TODO: Validate that a BinaryLibrary with the same LibraryId exists in previousRecords

		//
		// Values
		//

		// TODO: THIS

		return record;
	}

	/**
	 * Reads a MemberReference record.
	 * 
	 * @param {Array} previousRecords An array of records read before this one.
	 * @returns {MemberReference}
	 * @author Loren Goodwin
	 * @see https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A129%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C335%2C0%5D
	 */
	#readMemberReference(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading MemberReference record starting at position ${ this.position }`);

		const record =
		{
			RecordTypeEnum: DotNetBinaryReader.RecordTypeEnumeration.MemberReference,
			IdRef: this.readInt32(),
		};

		assert(record.IdRef >= 0, "MemberReference IdRef MUST be a positive integer.");
		
		// TODO: Something for this requirement:
		//
		// A Class, Array, or BinaryObjectString record MUST exist in the serialization stream with the
		// value as its ObjectId. Unlike other ID references, there is no restriction on where the record
		// that defines the ID appears in the serialization stream; that is, it MAY appear after the
		// referencing record.<9>

		return record;
	}

	/**
	 * Reads a SerializationHeader record.
	 * 
	 * @param {Array} previousRecords An array of records read before this one.
	 * @returns {SerializationHeaderRecord}
	 * @author Loren Goodwin
	 * @author Proddy
	 */
	#readSerializationHeader(previousRecords)
	{
		console.log(`[DotNetBinaryReader] Reading SerializationHeader record starting at position ${ this.position }`);
		
		const record =
		{
			RecordTypeEnum: DotNetBinaryReader.RecordTypeEnumeration.SerializedStreamHeader,

			RootId: this.readInt32(),
			HeaderId: this.readInt32(),
			MajorVersion: this.readInt32(),
			MinorVersion: this.readInt32(),
		};

		// TODO: Validate RootId
		//	See https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A136%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C431%2C0%5D

		// TODO: Validate HeaderId
		// 	See https://winprotocoldoc.blob.core.windows.net/productionwindowsarchives/MS-NRBF/[MS-NRBF].pdf#%5B%7B%22num%22%3A136%2C%22gen%22%3A0%7D%2C%7B%22name%22%3A%22XYZ%22%7D%2C69%2C431%2C0%5D
		
		assert(record.MajorVersion == 1, `Invalid serialized stream header major version: ${ record.MajorVersion }`);

		assert(record.MinorVersion == 0, `Invalid SerializedStreamHeader MinorVersion: ${ record.MinorVersion }`);

		return record;
	}
}