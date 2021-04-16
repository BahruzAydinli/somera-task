import "./App.css";
import { Table, Space, Form, Input, Popover, Button, Row, Col } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";
import "antd/dist/antd.css";

const spec_symbols = [
  { value: " ", margin: 0 },
  { value: ",", margin: 2 },
  { value: ".", margin: 2 },
  { value: "!", margin: 2 },
  { value: "?", margin: 2 },
  { value: "(", margin: 1 },
  { value: ")", margin: 2 },
  { value: "[", margin: 1 },
  { value: "]", margin: 2 },
  //more can be added proper to language specifications
];

const App = () => {
  const [parts, setParts] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [editing, setEditing] = useState(null);
  const [mouseIn, setMouseIn] = useState(null);

  const [replacement] = Form.useForm();
  const [editor] = Form.useForm();

  const [cursorPlace, setCursorPlace] = useState(0);
  const [transfering, setTransfering] = useState(null);

  const refContainer = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("sentences")) {
      let old_sentences = JSON.parse(localStorage.getItem("sentences"));
      setSentences(old_sentences);
    }
  }, []);

  //sentences table columns
  const columns = [
    {
      title: "Sentence",
      dataIndex: "sentence",
      key: "sentence",
    },
    {
      title: "Edit",
      key: "action",
      render: (record) => (
        <Space size="middle">
          <Button onClick={() => editASentence(record)} type="success">
            Edit
          </Button>
        </Space>
      ),
    },
    {
      title: "Delete",
      key: "action",
      render: (record) => (
        <Space size="middle">
          <Button onClick={() => deleteASentence(record)} type="danger">
            Delete
          </Button>
        </Space>
      ),
    },
    {
      title: "New sentence",
      key: "action",
      render: (record) => (
        <Space size="middle">
          <Button onClick={() => formSentence(record)} type="primary">
            Form sentence
          </Button>
        </Space>
      ),
    },
  ];

  //generates a sentence from spintax template
  const formSentence = (text) => {
    text = text.sentence;
    var matches, options, random;

    var regEx = new RegExp(/{([^{}]+?)}/);

    while ((matches = regEx.exec(text)) !== null) {
      options = matches[1].split("|");
      random = Math.floor(Math.random() * options.length);
      text = text.replace(matches[0], options[random]);
    }

    alert(text);
  };

  //to delete a sentence block
  const deleteASentence = (record) => {
    let new_sentences = sentences.filter((s) => s.key !== record.key);
    setSentences(new_sentences);
    localStorage.setItem("sentences", JSON.stringify(new_sentences));
  };

  //to delete a sentence block
  const editASentence = (record) => {
    setEditing(record.key);
    setParts(sentences.find((s) => s.key === record.key).parts);
  };

  //to save a word block
  const saveWordBlock = (values) => {
    let additions = handleSpecialCharacters(values.editor);
    let parts_copy = [...parts];
    if (!parts.length) {
      additions.forEach((a) => {
        parts_copy.push(a);
      });
      moveCursor(additions.length - 1);
    } else {
      if (cursorPlace === 0 || cursorPlace === parts.length) {
        additions.forEach((a) => {
          parts_copy.push(a);
        });
      } else {
        parts_copy.splice(cursorPlace + 1, 0, ...additions);
      }
      moveCursor(additions.length);
    }
    setParts(parts_copy);
    editor.resetFields();
    refContainer.current.focus();
  };

  //carrying special characters out of word blocks
  const handleSpecialCharacters = (block) => {
    if (block.length === 1) {
      let isspec = spec_symbols.map((s) => s.value).includes(block);
      return [
        {
          value: isspec ? block : [block],
          isspec,
        },
      ];
    }
    let start_parts = [];
    let end_parts = [];
    let dontleave = false;
    for (let i = 0; i < block.length; i++) {
      if (spec_symbols.map((s) => s.value).includes(block[i])) {
        start_parts.push({ value: block[i], isspec: true });
      } else {
        block = block.substr(i);
        dontleave = true;
        break;
      }
    }
    if (dontleave) {
      for (let j = block.length - 1; j > -1; j--) {
        if (spec_symbols.map((s) => s.value).includes(block[j])) {
          end_parts.unshift({ value: block[j], isspec: true });
        } else {
          end_parts.unshift({
            value: [block.substring(0, j + 1)],
            isspec: false,
          });
          break;
        }
      }
    }
    return start_parts.concat(end_parts);
  };

  //removing word blocks
  const handleBlockDelete = (index) => {
    if (index <= cursorPlace) {
      moveCursor(-1);
    }
    setParts(parts.filter((p, i) => i !== index));
  };

  //removing words inside word blocks
  const handleInnerWordBlockDelete = (index, index2) => {
    if (parts[index].value.length > 1) {
      let new_parts = [...parts];
      new_parts[index].value.splice(index2, 1);
      setParts(new_parts);
    } else {
      handleBlockDelete(index);
    }
  };

  //to save the replacement of a word
  const handleReplacementSave = (e) => {
    let new_parts = [...parts];
    new_parts[mouseIn].value.push(e.replacement);
    replacement.resetFields();
    setParts(new_parts);
  };

  //to save the formed sentence
  const saveSentence = () => {
    let new_sentences = [...sentences];
    let sentence = "";
    parts.forEach((part) => {
      if (part.isspec) {
        sentence += part.value;
      } else {
        if (part.value.length > 1) {
          sentence += "{";
          part.value.forEach((v, i) => {
            sentence += v;
            if (i !== part.value.length - 1) {
              sentence += "|";
            }
          });
          sentence += "}";
        } else {
          sentence += part.value[0];
        }
      }
    });
    if (editing) {
      new_sentences.find((s) => s.key === editing).parts = parts;
      new_sentences.find((s) => s.key === editing).sentence = sentence;
    } else {
      new_sentences.push({
        parts,
        sentence,
        key: sentences.length
          ? 1
          : Math.max(...sentences.map((s) => s.key)) + 1,
      });
    }
    setSentences(new_sentences);
    localStorage.setItem("sentences", JSON.stringify(new_sentences));
    resetEditor();
  };

  //reseting sentence editor
  const resetEditor = () => {
    setEditing(null);
    setCursorPlace(0);
    setParts([]);
    editor.resetFields();
  };

  //keeps track of active word block
  const mouseEnteredToTheBlock = (index) => {
    setMouseIn(index);
  };

  const allowDrop = (ev) => {
    ev.preventDefault();
  };

  const drag = (ev) => {
    if (ev.target.dataset.drop) {
      setTransfering(+ev.target.dataset.drop);
    } else {
      setTransfering(null);
    }
  };

  const drop = (ev) => {
    ev.preventDefault();
    var element = document.getElementById(`tag${ev.target.dataset.drop}`);
    if (element) {
      let after =
        ev.clientX >
        (element.getBoundingClientRect().right +
          element.getBoundingClientRect().left) /
          2
          ? 0
          : -1;
      let index = +ev.target.dataset.drop + after;
      if (transfering === null) {
        refContainer.current.focus();
        setCursorPlace(index);
      } else {
        if (index === -1) {
          index = 0;
        }
        let new_parts = [...parts];
        if (index >= new_parts.length) {
          var k = index - new_parts.length + 1;
          while (k--) {
            new_parts.push(undefined);
          }
        }
        new_parts.splice(index, 0, new_parts.splice(transfering, 1)[0]);
        setParts(new_parts);
      }
    }
  };

  const moveCursor = (direction) => {
    let place = cursorPlace;
    place += direction;
    console.log(place);
    setCursorPlace(place);
  };

  return (
    <div className="app container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div
            onDrop={drop}
            onDragOver={allowDrop}
            className="mt-10 mb-20 align-blocks"
          >
            {!parts.length || cursorPlace === -1 ? (
              <p
                draggable="true"
                onDragStart={drag}
                className="custom_tag blinking"
              >
                <span className="blinking-cursor">|</span>
              </p>
            ) : null}
            {parts.map((p, index) => {
              return (
                <div style={{ display: "flex" }} data-id={index} key={index}>
                  {!p.isspec ? (
                    <Popover
                      title={"Add new replacement"}
                      content={() => {
                        return (
                          <Form
                            form={replacement}
                            onFinish={(e) => handleReplacementSave(e)}
                          >
                            <Form.Item
                              name="replacement"
                              rules={[
                                {
                                  required: true,
                                  message: "Please input a replacement!",
                                },
                              ]}
                            >
                              <Input
                                id={`replacement${index}`}
                                placeholder="New replacement"
                              />
                            </Form.Item>
                            <Button htmlType="submit" type="primary">
                              Save
                            </Button>
                          </Form>
                        );
                      }}
                    >
                      <p
                        data-drop={index}
                        onDragStart={drag}
                        draggable="true"
                        id={`tag${index}`}
                        onMouseEnter={() => mouseEnteredToTheBlock(index)}
                        className={`custom_tag ${
                          p.value.length > 1 ? "multi" : ""
                        }`}
                      >
                        {p.value.map((v, index2) => {
                          return (
                            <span
                              data-drop={index}
                              data-id={index2}
                              key={`sub${index2}`}
                            >
                              <span data-drop={index}>{v}</span>
                              <CloseOutlined
                                data-drop={index}
                                onClick={() =>
                                  handleInnerWordBlockDelete(index, index2)
                                }
                              />
                              {index2 !== p.value.length - 1 ? (
                                <span className="line_btw">|</span>
                              ) : (
                                ""
                              )}
                            </span>
                          );
                        })}
                      </p>
                    </Popover>
                  ) : (
                    <p
                      data-drop={index}
                      onDragStart={drag}
                      draggable="true"
                      className="custom_tag special"
                      id={`tag${index}`}
                    >
                      {p.value === " " ? "_" : p.value}
                      <CloseOutlined
                        data-drop={index}
                        onClick={() => handleBlockDelete(index)}
                      />
                    </p>
                  )}
                  {cursorPlace === index ? (
                    <p
                      draggable="true"
                      onDragStart={drag}
                      className="custom_tag blinking"
                    >
                      <span className="blinking-cursor">|</span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Col>
        <Col span={16}>
          <Form form={editor} onFinish={saveWordBlock}>
            <Form.Item
              className="no-margin"
              name="editor"
              rules={[
                {
                  required: true,
                  message: "Please input text!",
                },
              ]}
            >
              <Input
                ref={refContainer}
                onPaste={() => false}
                onCut={() => false}
              />
            </Form.Item>
            <small>
              Press enter to add a word block &nbsp;&nbsp; | &nbsp;&nbsp; Click
              on blocks to add replacements.&nbsp;&nbsp; | &nbsp;&nbsp;
              Underscore replaces empty space.
            </small>
          </Form>
        </Col>
        <Col span={4}>
          <Button className="w-100" onClick={resetEditor} type="primary">
            Reset the editor
          </Button>
        </Col>
        <Col span={4}>
          <Button className="w-100" onClick={saveSentence} type="primary">
            Save the sentence
          </Button>
        </Col>
        <Col span={24}>
          <Table columns={columns} dataSource={sentences} />
        </Col>
      </Row>
    </div>
  );
};

export default App;
