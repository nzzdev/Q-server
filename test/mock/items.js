module.exports = [
  {
    _id: 'mock-item-inactive',
    tool: 'tool1',
    title: 'title',
    foo: 'bar',
    editedBy: 'username',
    createdBy: 'username',
    department: 'Storytelling',
    data: {
      foo: 'bar'
    },
    active: false
  },
  {
    _id: 'mock-item-active',
    title: 'title',
    tool: 'tool1',
    foo: 'bar',
    active: true
  },
  {
    _id: 'mock-item-to-test-edits',
    title: 'title',
    tool: 'tool1',
    foo: 'bar',
    active: true
  },
];
