import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  Index,
  BeforeRemove,
  OneToMany,
  ManyToOne,
  AfterUpdate,
  AfterInsert,
  UpdateDateColumn
} from 'typeorm'
import * as common from '../../common'
import fs from 'fs/promises'

@Entity()
export class Picture {
  @PrimaryGeneratedColumn('increment')
  id?: number

  @Column('text')
  @Index({ unique: true })
  filepath!: string

  @Column('text')
  @Index({ unique: true })
  md5!: string

  @Column('int')
  width!: number

  @Column('int')
  height!: number

  @Column('text', { nullable: true, unique: true })
  thumb_path?: string

  @Column('text', { nullable: true })
  description?: string

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updated_at?: Date

  @ManyToOne(() => Album, (album) => album.pictures, {
    eager: true
  })
  album?: Album

  @ManyToMany(() => PictureTag, (tag) => tag.pictures, {
    cascade: true,
    eager: true
  })
  @JoinTable()
  tags!: PictureTag[]

  @AfterInsert()
  async afterInsert(): Promise<void> {
    await common.meilisearchClient.index('phologix').addDocuments(
      [
        {
          md5: this.md5!,
          tags: this.tags.map((tag) => tag.name),
          description: this.description
        }
      ],
      {
        primaryKey: 'md5'
      }
    )
  }

  @AfterUpdate()
  async afterUpdate(): Promise<void> {
    await common.meilisearchClient
      .index('phologix')
      .updateDocuments([
        { md5: this.md5!, tags: this.tags.map((tag) => tag.name), description: this.description }
      ])
  }

  @BeforeRemove()
  async beforeRemove(): Promise<void> {
    console.log(`picture ${this.md5} removed`)
    if (!this.md5) {
      throw new Error('picture md5 should not be null')
    }
    await common.meilisearchClient.index('phologix').deleteDocument(this.md5!)
    if (this.thumb_path) {
      try {
        await fs.unlink(this.thumb_path)
      } catch {
        console.warn(`failed to delete thumb file ${this.thumb_path}`)
      }
    }
  }
}

@Entity()
export class PictureTag {
  @PrimaryGeneratedColumn('increment')
  id?: number

  @Column('text')
  @Index({ unique: true })
  name!: string

  @Column('text', { nullable: true })
  translate?: string

  @ManyToMany(() => Picture, (picture) => picture.tags)
  pictures!: Picture[]
}

@Entity()
export class Album {
  @PrimaryGeneratedColumn('increment')
  id?: number

  @Column('text')
  @Index({ unique: true })
  path!: string

  @Column('text', { nullable: true })
  name?: string

  @Column('boolean', { default: true })
  watch!: boolean

  @Column('text', { nullable: true })
  description?: string

  @OneToMany(() => Picture, (picture) => picture.album)
  pictures!: Picture[]
}
