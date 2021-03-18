import { Injectable } from '@nestjs/common';
import { Example } from './interfaces/example.interface';

@Injectable()
export class ExamplesService {
    private readonly examples: Example[] = [];

    create(example: Example) {
        this.examples.push(example);
    }

    findAll(): Example[] {
        return this.examples;
    }
}
