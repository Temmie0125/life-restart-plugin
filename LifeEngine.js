// LifeEngine.js
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 导入原游戏核心模块
import Life from './lib/life.js'
import $lang from './data/zh-cn.js'  // 假设语言文件在这个路径

class LifeEngine {
    constructor() {
        this.life = null
        this.currentLife = null
        this.isAutoPlaying = false
        this.events = []
        this.dataLoaded = false
        
        // 设置全局变量（与原app.js保持一致）
        globalThis.$lang = $lang
        
        // 模拟 localStorage（简化版本，不存储数据）
        this.setupLocalStorage()
        
        // 创建全局json函数
        globalThis.json = async (fileName) => {
            try {
                const filePath = join(__dirname, './public/data/', `${fileName}.json`)
                const data = await readFile(filePath, 'utf-8')
                return JSON.parse(data)
            } catch (error) {
                console.error(`加载数据文件 ${fileName}.json 失败:`, error)
                throw error
            }
        }
        
        // 设置全局事件系统（与原app.js保持一致）
        globalThis.$$eventMap = new Map()
        globalThis.$$event = (tag, data) => {
            const listener = $$eventMap.get(tag)
            if (listener) listener.forEach(fn => fn(data))
        }
        globalThis.$$on = (tag, fn) => {
            let listener = $$eventMap.get(tag)
            if (!listener) {
                listener = new Set()
                $$eventMap.set(tag, listener)
            }
            listener.add(fn)
        }
        globalThis.$$off = (tag, fn) => {
            const listener = $$eventMap.get(tag)
            if (listener) listener.delete(fn)
        }
    }

    // 设置模拟的 localStorage
    setupLocalStorage() {
        // 创建一个简单的内存存储来模拟 localStorage
        const storage = {
            data: {},
            getItem(key) {
                return this.data[key] === undefined ? null : this.data[key]
            },
            setItem(key, value) {
                this.data[key] = value
            },
            removeItem(key) {
                delete this.data[key]
            },
            clear() {
                this.data = {}
            },
            key(index) {
                return Object.keys(this.data)[index] || null
            },
            get length() {
                return Object.keys(this.data).length
            }
        }
        
        // 设置全局 localStorage 对象
        globalThis.localStorage = storage
        
        // 模拟原游戏中的 talentExtend 属性
        globalThis.localStorage.talentExtend = null
        
        // 模拟原游戏中的 dumpLocalStorage 函数
        globalThis.dumpLocalStorage = () => {
            // 空函数，不进行任何操作
            //console.log('dumpLocalStorage called (no-op in bot version)')
        }
    }

    // 加载游戏数据
    async loadData() {
        if (this.dataLoaded) return
        
        console.log('开始加载游戏数据...')
        
        // 创建Life实例
        this.life = new Life()
        
        // 配置游戏（与原app.js中的配置保持一致）
        this.life.config({
            defaultPropertyPoints: 20,
            talentSelectLimit: 3,
            propertyAllocateLimit: [0, 10],
            defaultPropertys: { SPR: 5 },
            talentConfig: {
                talentPullCount: 10,
                talentRate: { 1: 100, 2: 10, 3: 1, total: 1000 },
                additions: {
                    TMS: [
                        [10, { 2: 1 }],
                        [30, { 2: 2 }],
                        [50, { 2: 3 }],
                        [70, { 2: 4 }],
                        [100, { 2: 5 }],
                    ],
                    CACHV: [
                        [10, { 2: 1 }],
                        [30, { 2: 2 }],
                        [50, { 2: 3 }],
                        [70, { 2: 4 }],
                        [100, { 2: 5 }],
                    ],
                },
            },
            propertyConfig: {
                judge: {
                    RTLT: [
                        [0, 0],
                        [0.3, 1],
                        [0.6, 2],
                        [0.9, 3],
                    ],
                    REVT: [
                        [0, 0],
                        [0.2, 1],
                        [0.4, 2],
                        [0.6, 3],
                    ],
                    TMS: [
                        [0, 0, '抽到紫色概率不变'],
                        [10, 1, '抽到紫色概率翻倍'],
                        [30, 1, '抽到紫色概率三倍'],
                        [50, 2, '抽到紫色概率四倍'],
                        [70, 2, '抽到紫色概率五倍'],
                        [100, 3, '抽到紫色概率六倍'],
                    ],
                    CACHV: [
                        [0, 0, '抽到橙色概率不变'],
                        [10, 1, '抽到橙色概率翻倍'],
                        [30, 1, '抽到橙色概率三倍'],
                        [50, 2, '抽到橙色概率四倍'],
                        [70, 2, '抽到橙色概率五倍'],
                        [100, 3, '抽到橙色概率六倍'],
                    ],
                    HCHR: [
                        [0, 0, '地狱'],
                        [1, 0, '折磨'],
                        [2, 0, '不佳'],
                        [4, 0, '普通'],
                        [7, 1, '优秀'],
                        [9, 2, '罕见'],
                        [11, 3, '逆天'],
                    ],
                    HMNY: [
                        [0, 0, '地狱'],
                        [1, 0, '折磨'],
                        [2, 0, '不佳'],
                        [4, 0, '普通'],
                        [7, 1, '优秀'],
                        [9, 2, '罕见'],
                        [11, 3, '逆天'],
                    ],
                    HSPR: [
                        [0, 0, '地狱'],
                        [1, 0, '折磨'],
                        [2, 0, '不幸'],
                        [4, 0, '普通'],
                        [7, 1, '幸福'],
                        [9, 2, '极乐'],
                        [11, 3, '天命'],
                    ],
                    HINT: [
                        [0, 0, '地狱'],
                        [1, 0, '折磨'],
                        [2, 0, '不佳'],
                        [4, 0, '普通'],
                        [7, 1, '优秀'],
                        [9, 2, '罕见'],
                        [11, 3, '逆天'],
                        [21, 3, '识海'],
                        [131, 3, '元神'],
                        [501, 3, '仙魂'],
                    ],
                    HSTR: [
                        [0, 0, '地狱'],
                        [1, 0, '折磨'],
                        [2, 0, '不佳'],
                        [4, 0, '普通'],
                        [7, 1, '优秀'],
                        [9, 2, '罕见'],
                        [11, 3, '逆天'],
                        [21, 3, '凝气'],
                        [101, 3, '筑基'],
                        [401, 3, '金丹'],
                        [1001, 3, '元婴'],
                        [2001, 3, '仙体'],
                    ],
                    HAGE: [
                        [0, 0, '胎死腹中'],
                        [1, 0, '早夭'],
                        [10, 0, '少年'],
                        [18, 0, '盛年'],
                        [40, 0, '中年'],
                        [60, 1, '花甲'],
                        [70, 1, '古稀'],
                        [80, 2, '杖朝'],
                        [90, 2, '南山'],
                        [95, 3, '不老'],
                        [100, 3, '修仙'],
                        [500, 3, '仙寿'],
                    ],
                    SUM: [
                        [0, 0, '地狱'],
                        [1, 0, '折磨'],
                        [2, 0, '不佳'],
                        [4, 0, '普通'],
                        [7, 1, '优秀'],
                        [9, 2, '罕见'],
                        [11, 3, '逆天'],
                        [120, 3, '传说'],
                    ],
                },
            },
            characterConfig: {
                characterPullCount: 3,
                rateableKnife: 10,
                propertyWeight: [
                    [0, 1],
                    [1, 2],
                    [2, 3],
                    [3, 4],
                    [4, 5],
                    [5, 6],
                    [6, 5],
                    [7, 4],
                    [8, 3],
                    [9, 2],
                    [10, 1],
                ],
                talentWeight: [
                    [1, 1],
                    [2, 2],
                    [3, 3],
                    [4, 2],
                    [5, 1],
                ],
            },
        })
        
        console.log('游戏配置完成，开始初始化...')
        
        // 初始化游戏（与原app.js保持一致）
        try {
            await this.life.initial(
                dataSet => json(`zh-cn/${dataSet}`),
                json
            )
            console.log('游戏初始化完成')
        } catch (error) {
            console.error('游戏初始化失败:', error)
            throw error
        }
        
        this.dataLoaded = true
    }

    // 开始新游戏 - 修改为保存天赋信息
    async startNewLife() {
        if (!this.dataLoaded) {
            await this.loadData()
        }
        
        console.log('开始新游戏...')
        
        try {
            // 随机分配3个天赋
            const randomTalents = this.life.talentRandom()
            console.log(`随机获取到 ${randomTalents.length} 个天赋`)
            
            // 保存完整的天赋对象，不仅仅是ID
            this.selectedTalents = randomTalents
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
            
            console.log('选择的天赋:', this.selectedTalents.map(t => t.name).join(', '))
            
            // 获取天赋ID
            const selectedTalentIds = this.selectedTalents.map(t => t.id)
            console.log(`选择的天赋ID: ${selectedTalentIds.join(', ')}`)
            
            this.life.remake(selectedTalentIds)
            this.events = []
            
            const propertyPoints = this.life.getPropertyPoints()
            console.log(`总属性点数: ${propertyPoints}`)
            
            return {
                propertyPoints: propertyPoints,
                defaultProperty: {
                    CHR: 0,
                    INT: 0,
                    STR: 0,
                    MNY: 0,
                    SPR: 5
                }
            }
        } catch (error) {
            console.error('开始新游戏失败:', error)
            throw error
        }
    }

    // 分配属性
    allocateProperty(properties) {
        console.log('分配属性:', properties)
        this.life.start(properties)
        this.currentLife = {
            properties,
            age: 0,
            records: []
        }
    }

    // 自动播放直到结束
    async autoPlay() {
        console.log('开始自动播放人生...')
        this.events = []
        
        let yearCount = 0
        while (true) {
            const record = this.life.next()
            this.events.push(record)
            yearCount++
            
            // 每10年输出一次进度
            if (yearCount % 10 === 0) {
                console.log(`已模拟 ${yearCount} 年，当前年龄: ${record.age}岁`)
            }
            
            if (record.isEnd) {
                console.log(`人生结束，享年 ${record.age}岁，总共 ${yearCount} 年`)
                break
            }
        }
        
        // 获取选择的天赋信息
        let talentsInfo = []
        try {
            // 尝试从游戏实例中获取已选择的天赋
            if (this.life && this.life.getSelectedTalents) {
                talentsInfo = this.life.getSelectedTalents()
            } else if (this.selectedTalents) {
                // 如果游戏实例没有这个方法，使用我们保存的天赋
                talentsInfo = this.selectedTalents
            }
            console.log('获取到的天赋信息:', talentsInfo)
        } catch (error) {
            console.error('获取天赋信息失败:', error)
        }
        
        return {
            summary: this.life.summary || {},
            events: this.events,
            talents: talentsInfo
        }
    }
    
    // 获取默认属性
    getDefaultProperty() {
        return {
            CHR: 0,
            INT: 0,
            STR: 0,
            MNY: 0,
            SPR: 5
        }
    }
}

export default LifeEngine