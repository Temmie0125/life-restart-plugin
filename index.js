// index.js
import plugin from '../../lib/plugins/plugin.js'
import LifeEngine from './LifeEngine.js'
import fs from 'fs'
import path from 'path'
import puppeteer from '../../lib/puppeteer/puppeteer.js'
/** 休眠函数
 * @time 毫秒
 */
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
export class LifeRestart extends plugin {
    constructor() {
        super({
            name: '人生重开模拟器',
            dsc: '文字冒险游戏，体验不一样的人生',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#?(人生重开|重启人生|remake)(?:\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(\\d+))?$',
                    fnc: 'startGame'
                },
                {
                    reg: '^#?随机人生重开$',
                    fnc: 'randomLife'
                },
                {
                    reg: '^#?人生重开帮助$',
                    fnc: 'showHelp'
                }
            ]
        })

        this.lifeEngine = null
        this.userGames = new Map() // 存储用户游戏状态
    }

    async showHelp(e){
        const msg = this.getGameGuide(20);
        return e.reply(msg)
    }

    // 开始游戏 - 支持直接分配属性或随机分配
    async startGame(e) {
        const userId = e.user_id
        const msg = e.msg.trim()

        try {
            // 解析命令参数
            const match = msg.match(/^#?(人生重开|重启人生|remake)(?:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+))?$/i)

            // 创建LifeEngine实例
            if (!this.lifeEngine) {
                this.lifeEngine = new LifeEngine()
            }

            // 初始化游戏
            const gameData = await this.lifeEngine.startNewLife()
            const totalPoints = gameData.propertyPoints
            const defaultProps = gameData.defaultProperty

            let allocatedProps = { ...defaultProps }

            // 检查是否有5个参数（直接分配属性）
            if (match && match[2] && match[3] && match[4] && match[5] && match[6]) {
                // 解析5个属性值
                const chr = parseInt(match[2])
                const int = parseInt(match[3])
                const str = parseInt(match[4])
                const mny = parseInt(match[5])
                const spr = parseInt(match[6])

                // 验证所有值都是有效数字
                if (isNaN(chr) || isNaN(int) || isNaN(str) || isNaN(mny) || isNaN(spr)) {
                    e.reply('请提供有效的数字属性值')
                    return true
                }

                // 验证单项属性范围
                if (chr < 0 || chr > 10 || int < 0 || int > 10 || str < 0 || str > 10 ||
                    mny < 0 || mny > 10 || spr < 0 || spr > 10) {
                    e.reply('单项属性范围：0-10')
                    return true
                }

                // 计算总点数
                const usedPoints = chr + int + str + mny + spr

                if (usedPoints !== totalPoints) {
                    e.reply(`属性点分配不正确！\n总点数应为 ${totalPoints}，但分配了 ${usedPoints} 点`)
                    return true
                }

                // 设置分配属性
                allocatedProps = {
                    CHR: chr,
                    INT: int,
                    STR: str,
                    MNY: mny,
                    SPR: spr
                }

                // 直接开始游戏
                return await this.startLifeImmediately(e, userId, allocatedProps)
            } else {
                // 没有参数，进入引导模式
                return e.reply("喂喂喂，你还没有输入属性点呢！格式：#人生重开 五个属性值")
            }

        } catch (err) {
            logger.error('开始游戏失败:', err)
            e.reply('游戏初始化失败，请稍后再试~')
        }

        return true
    }

    // 随机分配属性并开始游戏
    async randomLife(e) {
        const userId = e.user_id

        try {
            // 创建LifeEngine实例
            if (!this.lifeEngine) {
                this.lifeEngine = new LifeEngine()
            }

            // 初始化游戏
            const gameData = await this.lifeEngine.startNewLife()
            const totalPoints = gameData.propertyPoints

            // 随机分配属性
            const allocatedProps = this.randomAllocateProperties(totalPoints)

            // 显示随机分配结果
            const allocationMsg = this.formatAllocationResult(allocatedProps, totalPoints)
            e.reply(`🎲 随机分配结果：\n${allocationMsg}\n\n正在开始游戏...`)
            await sleep(1000) // 等1秒

            // 直接开始游戏
            await this.startLifeImmediately(e, userId, allocatedProps)

        } catch (err) {
            logger.error('随机分配失败:', err)
            e.reply('随机分配失败，请稍后再试~')
        }

        return true
    }

    // 随机分配属性算法
    randomAllocateProperties(totalPoints) {
        let remaining = totalPoints
        const props = ['CHR', 'INT', 'STR', 'MNY', 'SPR']
        const allocated = {
            CHR: 0,
            INT: 0,
            STR: 0,
            MNY: 0,
            SPR: 5  // 默认快乐值
        }

        // 先为快乐分配固定值（如果需要的话）
        if (allocated.SPR > 0) {
            remaining -= allocated.SPR
        }

        // 随机分配剩余点数
        while (remaining > 0) {
            const prop = props[Math.floor(Math.random() * props.length)]

            // 跳过已满的属性
            if (allocated[prop] >= 10) continue

            // 随机分配1-3点，但不能超过剩余点数和上限
            const add = Math.min(
                Math.floor(Math.random() * 3) + 1,
                remaining,
                10 - allocated[prop]
            )

            allocated[prop] += add
            remaining -= add
        }

        return allocated
    }

    // 直接开始游戏（不经过交互分配）
    async startLifeImmediately(e, userId, allocatedProps) {
        // 提示等待
        e.reply('正在生成你的人生轨迹，这可能需要几秒钟，请稍候...')

        try {
            // 设置属性
            this.lifeEngine.allocateProperty(allocatedProps)

            // 自动播放并收集所有事件
            const result = await this.lifeEngine.autoPlay()

            // 生成HTML图片
            const imagePath = await this.generateResultImage(userId, result)
            await sleep(2000) // 等2秒再发送

            // 发送结果
            await e.reply([
                '你的人生轨迹已生成：',
                imagePath,
                '输入 #人生重开 五项属性点 或 #随机人生重开 开始新一轮人生'
            ])

            // 清理状态（如果存在）
            if (this.userGames.has(userId)) {
                this.userGames.delete(userId)
            }

        } catch (err) {
            logger.error('生成人生轨迹失败:', err)
            e.reply('生成失败，请重试')
        }
    }

    // 获取游戏引导信息
    getGameGuide(totalPoints) {
        return `🎮 人生重开模拟器
📝 使用方法：
1. 直接分配属性：
   #人生重开 颜值 智力 体质 家境 快乐
   示例：#人生重开 4 4 4 4 4

2. 随机分配：
   #随机人生重开

💡 属性说明：
👤 颜值(CHR)：影响社交、恋爱等
🧠 智力(INT)：影响学习、工作等
💪 体质(STR)：影响健康、寿命等
💰 家境(MNY)：影响初始资源、机会等
😊 快乐(SPR)：影响幸福感

🚫 限制：
- 单项属性范围：0-10
- 5项属性总和必须为 ${totalPoints}

输入指令开始你的新人生吧！`
    }

    // 格式化分配结果
    formatAllocationResult(allocated, totalPoints) {
        const used = Object.values(allocated).reduce((a, b) => a + b, 0)

        return `👤 颜值(CHR): ${allocated.CHR}
🧠 智力(INT): ${allocated.INT}
💪 体质(STR): ${allocated.STR}
💰 家境(MNY): ${allocated.MNY}
😊 快乐(SPR): ${allocated.SPR}

总计: ${used}/${totalPoints} 点`
    }

    // 格式化事件内容
    formatEventContent(event) {
        if (!event || !event.content) return ''

        // 如果 content 是字符串，直接返回
        if (typeof event.content === 'string') {
            return event.content
        }

        // 如果 content 是数组，格式化为字符串
        if (Array.isArray(event.content)) {
            return event.content.map(item => {
                if (!item) return ''

                // 根据不同类型格式化
                if (item.type === 'TLT' && item.name && item.description) {
                    return `天赋【${item.name}】发动：${item.description}`
                } else if (item.type === 'EVT') {
                    let text = item.description || ''
                    if (item.postEvent) {
                        text += ` ${item.postEvent}`
                    }
                    return text
                } else if (item.description) {
                    return item.description
                } else if (typeof item === 'string') {
                    return item
                }
                return JSON.stringify(item)
            }).filter(text => text.trim().length > 0).join('\n')
        }

        // 其他情况返回 JSON 字符串
        return JSON.stringify(event.content)
    }

    // 格式化天赋信息
    formatTalentInfo(talent) {
        if (!talent) return ''
        
        if (typeof talent === 'object') {
            if (talent.name && talent.description) {
                return `${talent.name} - ${talent.description}`
            } else if (talent.name) {
                return talent.name
            }
            return JSON.stringify(talent)
        }
        
        return talent.toString()
    }


    // 在 generateResultImage 方法中修改天赋格式化部分
    // 生成结果图片
    async generateResultImage(userId, result) {
        const templatePath = path.join(process.cwd(), 'plugins/life-restart/templates/result.html')
        const outputDir = path.join(process.cwd(), 'data/life-restart')
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
        }
        
        const outputPath = path.join(outputDir, `${userId}_${Date.now()}.png`)
        
        // 格式化事件
        const formattedEvents = []
        if (result.events && Array.isArray(result.events)) {
            result.events.forEach(event => {
                if (event && event.age !== undefined) {
                    formattedEvents.push({
                        age: event.age,
                        content: this.formatEventContent(event),
                        isEnd: event.isEnd || false
                    })
                }
            })
        }
        
        // 格式化天赋 - 保持为对象数组，而不是字符串数组
        const formattedTalents = []
        if (result.talents && Array.isArray(result.talents)) {
            result.talents.forEach(talent => {
                if (talent && typeof talent === 'object') {
                    formattedTalents.push({
                        name: talent.name || '未知天赋',
                        description: talent.description || '',
                        grade: talent.grade || 0
                    })
                } else if (typeof talent === 'string') {
                    // 如果已经是字符串，转换为对象
                    formattedTalents.push({
                        name: talent,
                        description: '',
                        grade: 0
                    })
                }
            })
        }
        
        // 格式化总评
        const formattedSummary = []
        if (result.summary) {
            // 定义属性映射
            const propertyMap = {
                'HCHR': { name: '颜值', emoji: '👤' },
                'HINT': { name: '智力', emoji: '🧠' },
                'HSTR': { name: '体质', emoji: '💪' },
                'HMNY': { name: '家境', emoji: '💰' },
                'HSPR': { name: '快乐', emoji: '😊' },
                'HAGE': { name: '享年', emoji: '⏳' },
                'SUM': { name: '总评', emoji: '📊' }
            }
            
            Object.keys(result.summary).forEach(key => {
                const item = result.summary[key]
                if (item && item.judge !== undefined && item.value !== undefined) {
                    const propertyInfo = propertyMap[key] || { name: key, emoji: '📌' }
                    formattedSummary.push({
                        key: key,
                        name: propertyInfo.name,
                        emoji: propertyInfo.emoji,
                        value: item.value,
                        judge: item.judge || '',
                        grade: item.grade || 0
                    })
                }
            })
        }
        
        // 准备模板数据
        const data = {
            title: '人生重开模拟器 - 人生轨迹',
            summary: formattedSummary,
            events: formattedEvents,
            talents: formattedTalents,
            totalEvents: result.events ? result.events.length : 0,
            saveId: `life_result_${userId}`,
            tplFile: templatePath,
            _plugin: '人生重开模拟器'
        }
        
        try {
            // 使用puppeteer生成图片
            const screenshot = await puppeteer.screenshot('lifeResult', data)
            
            return screenshot
        } catch (err) {
            logger.error('生成图片失败:', err)
            throw err
        }
    }
}