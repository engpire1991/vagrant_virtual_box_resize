# vagrant_virtual_box_resize
script to resize and rename the default VMDK attachmed to new machine created via vagrant

# usage
`node doRename name`  
where name is a name of the folder where virtual box files for the machine are kept
Currently the script must be put in the folder where VirtualBox stores all Machines ( 'Default Machine Folder' in VirtualBox Preferences)

# TODO
- Add possibility to choose the new vmdk size ( currently hardcoded to ~100GB )
- Add possibility to set path to Machine folder, so that the script can be held anywhere. Or just read the 'Default Machine Folder' from VirtualBox
