# N5 词库来源

网页版的 N5 单词模式包含 662 个初级词汇。JLPT 官方不发布固定词表，因此等级划分仅作为社区学习参考。

## OpenJLPT

- 项目：https://github.com/evanclan/OpenJLPT
- 用途：N5 词条、假名读音、英文释义与日语例句
- 许可：CC BY-SA 4.0
- 本项目的修改：转换为浏览器可直接读取的格式；补充中文释义、罗马音与主题章节；修正少量明显的旧字形或读音问题。

## Japanese-Chinese-thesaurus

- 项目：https://github.com/lxl66566/Japanese-Chinese-thesaurus
- 用途：辅助整理简体中文释义
- 许可：Unlicense

## egg rolls JLPT N1-N5

- 项目：https://github.com/5mdld/anki-jlpt-decks
- 用途：为可匹配的 N5 词条补充简体中文释义与例句翻译
- 许可：CC BY-NC 4.0
- 本项目的修改：仅提取 N5 相关字段，转换格式并修正少量释义；相关内容仅供非商业学习使用。

## Open JTalk 补充语音

- 项目：https://open-jtalk.sourceforge.net/
- 用途：为原词库中没有独立录音的 60 个词生成本地日语发音，文件位于 `audio/words-generated/`。
- Open JTalk 许可：Modified BSD License
- 使用音色：HTS Voice “Mei”，Copyright (c) 2009–2013 Nagoya Institute of Technology, Department of Computer Science，依据 CC BY 3.0 使用。
- 生成清单：`data/generated-word-audio.json`

生成后的词库位于 `data/n5-vocab.js`。本项目不声称该列表是 JLPT 官方词表。
