# Dinkum Save Converter
This is a command line tool for converting saved games for the game [Dinkum](https://store.steampowered.com/app/1062520/Dinkum/) to and from JSON.

## Usage
Install [Node.js](https://nodejs.org/en/) 18.0.0 or later. It may work in earlier versions, too, but I didn't try it so your mileage may vary.

Once you've done that, run the script as follows:

```
cd ./dinkum-save-converter/src

node .
```

It defaults to reading `Slot0` out of your Dinkum save directory but you can also pass a path as a command line argument:

```
node . "C:\\Users\\Loren\\Desktop\\Slot0"
```

A `_JSON_DUMP` folder will be created in the save directory.

This tool should work on Windows and Linux.

## Status
Currently, you can **only partially dump** your save data. Files that cannot be dumped will not have a corresponding JSON file in the `_JSON_DUMP` folder.

Furthermore, the files are currently dumped as essentially one-to-one representations of the Microsoft .NET BinaryFormatter file format that the game uses. I intend to improve upon this in the future after converting the data.

## Special Thanks
My good friend, [Proddy](https://github.com/Hampo), has been a tremendous help with this project so far and I'd like to thank him here for his assistance.

## License
[MIT](https://github.com/duckdotapk/dinkum-save-converter/blob/main/LICENSE.md)