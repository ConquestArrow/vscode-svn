# VSCode Subversion (SVN) integrating extension

**This extension is currently WORK IN PROGRESS.**


## Features

### 1. Gutter indicator 

VSCode-svn supports a gutter diff indicator. It's like a default git one.


### 2. Status bar infomation

VSCode-svn shows "`svn st`" infomations of a opened file.

|Icon|Status|
|:--:|:-----|
|✔|normal |
|💥|conflicted |
|❔|unversioned|
|⚠|modified|
|❗|missing|
|✚|added|
|🔒|locked|
|♻|replaced|
|❌|deleted|
|🚫|ignored|

Tooltip shows status text, last commited revision, and commit author of a opened file.

## TODO

1. svn command integration
2. command to show svn status lists