# Problems 

We have this lines: 

```js
app.use('/', express.static(path.join(__dirname, 'static')))
```
And the code that connects to SQL Server. 

The code works separately, that is, if I comment out the `app.use...` line, it'll connect to the database. Otherwise, it won't. I'm not sure if these two pieces of code need to be in separate files, or if I just have a basic JavaScript error that I could fix if I started learning JavaScript from the beginning. 

Thanks for all your help! I'll keep searching, and I'll let you know what solutions (if any) I find! 
