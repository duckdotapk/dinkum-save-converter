//
// Exports
//

/**
 * A class for reading binary files.
 */
export class BinaryReader
{
	/**
	 * @type {Number}
	 */
	position = 0;

	/** 
	 * @type {DataView} 
	 */
	view;

	/**
	 * Constructs a new BinaryReader.
	 * 
	 * @param {ArrayBuffer} arrayBuffer 
	 * @author Loren Goodwin
	 */
	constructor(arrayBuffer)
	{
		this.view = new DataView(arrayBuffer);
	}

	/**
	 * Returns a signed 8-bit integer.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readInt8()
	{
		const int = this.view.getInt8(this.position);

		this.position += 1;

		return int;
	}

	/**
	 * Reads a signed 16-bit integer.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readInt16()
	{
		const int = this.view.getInt16(this.position, true);

		this.position += 2;

		return int;
	}

	/**
	 * Reads a signed 32-bit integer.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readInt32()
	{
		const int = this.view.getInt32(this.position, true);

		this.position += 4;

		return int;
	}

	/**
	 * Reads a signed 64-bit integer.
	 * 
	 * @returns {BigInt}
	 * @author Loren Goodwin
	 */
	readInt64()
	{
		const bigInt = this.view.getBigInt64(this.position, true);

		this.position += 8;

		return bigInt;
	}

	/**
	 * Reads an unsigned 8-bit integer.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readUInt8()
	{
		const int = this.view.getUint8(this.position, true);

		this.position += 1;

		return int;
	}

	/**
	 * Reads an unsigned 16-bit integer.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readUInt16()
	{
		const int = this.view.getUint16(this.position, true);

		this.position += 2;

		return int;
	}

	/**
	 * Reads an unsigned 32-bit integer.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readUInt32()
	{
		const int = this.view.getUint32(this.position, true);

		this.position += 4;

		return int;
	}
	
	/**
	 * Reads an unsigned 64-bit integer.
	 * 
	 * @returns {BigInt}
	 * @author Loren Goodwin
	 */
	readUInt64()
	{
		const bigInt = this.view.getBigUint64(this.position, true);

		this.position += 8;

		return bigInt;
	}

	/**
	 * Returns a 32-bit floating point number.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readFloat32()
	{
		const float = this.view.getFloat32(this.position, true);

		this.position += 4;

		return float;
	}

	/**
	 * Reads a 64-bit floating point number.
	 * 
	 * @returns {Number}
	 * @author Loren Goodwin
	 */
	readFloat64()
	{
		const float = this.view.getFloat64(this.position, true);

		this.position += 8;

		return float;
	}

	/**
	 * Reads a char.
	 * 
	 * @returns {String}
	 * @author Loren Goodwin
	 */
	readChar()
	{
		const int = this.readUInt8();

		return String.fromCharCode(int);
	}

	/**
	 * Reads a string.
	 * 
	 * This function assumes the next byte is a string length followed by the bytes of the string.
	 * 
	 * @returns {String}
	 * @author Loren Goodwin
	 */
	readString() 
	{
		const length = this.readUInt8();

		let buffer = [];

		for (let i = 0; i < length; i++) 
		{
			buffer.push(this.readUInt8());
		}
	
		return String.fromCharCode.apply(String, buffer);
	}
}