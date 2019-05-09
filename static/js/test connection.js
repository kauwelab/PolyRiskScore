var dbConnection = SQL.connect({
  Driver: "MySQL",
  Host: "localhost",
  Port: 1434,
  Database: "TutorialDB",
  UserName: "root",
  Password: "12345" });
var sql = "SELECT COUNT(*) as EmployeeCount FROM dbo.Employees;";
var result = dbConnection.query(sql);
if (!result.isValid) {
  test.fail("Entry not found.");
} else {
  test.compare(result.value("EmployeeCount"), 4);
}
dbConnection.close();