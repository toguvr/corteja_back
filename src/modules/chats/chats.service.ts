/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import whatsApi from '@/core/services/whats';
import validator from 'validator';
import { SchedulesService } from '../schedules/schedules.service';
import { CustomersService } from '../customers/customers.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { BalancesService } from '../balances/balances.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: SchedulesService,
    private readonly customerService: CustomersService,
    private readonly appointmentService: AppointmentsService,
    private readonly balanceService: BalancesService,
    private readonly ordersService: OrdersService,
  ) {}
  isValidDate(value: string): boolean {
    if (!value) return false;

    const date = typeof value === 'string' ? new Date(value) : value;
    return !isNaN(date.getTime());
  }
  async isValidScheduleId(value: string): Promise<boolean> {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: value },
    });
    return !!schedule;
  }
  getAvailableDatesFromSchedules(
    weeksToSchedule: number,
    schedules: { weekDay?: string; id: string }[],
  ): { id: Date; label: string; scheduleId: string }[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDayOfWeek = today.getDay();
    const daysUntilEnd = weeksToSchedule * 7 - 1 - currentDayOfWeek;

    const end = new Date(today);
    end.setDate(today.getDate() + daysUntilEnd);
    end.setHours(0, 0, 0, 0);

    const dates: { id: Date; label: string; scheduleId: string }[] = [];
    const cursor = new Date(today);

    while (cursor <= end) {
      const weekDay = cursor.getDay();
      const matchingSchedule = schedules.find(
        (s) => parseInt(s.weekDay ?? '-1') === weekDay,
      );

      if (matchingSchedule) {
        const dateClone = new Date(cursor);
        const label = dateClone.toLocaleDateString('pt-BR');
        dates.push({
          id: dateClone,
          label,
          scheduleId: matchingSchedule.id,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  getAvailableSchedulesForDate(
    date: Date,
    schedules: {
      id: string;
      time: string;
      weekDay: string;
      limit: number;
      appointments?: { date: string }[];
      subscriptions?: { active: boolean }[];
    }[],
  ) {
    const selectedDay = date.getDay(); // 0 = domingo
    const now = new Date();

    return schedules
      .filter((s) => Number(s.weekDay) === selectedDay && s.time)
      .filter((s) => {
        // Verifica se o horário já passou, caso seja hoje
        const [hour, minute] = s.time.split(':').map(Number);
        const scheduleDateTime = new Date(date);
        scheduleDateTime.setHours(hour, minute, 0, 0);

        const isPast =
          date.toDateString() === now.toDateString() && scheduleDateTime < now;
        if (isPast) return false;

        const appointmentsToday =
          s.appointments?.filter((a) => {
            const aDate = new Date(a.date);
            return (
              aDate.getFullYear() === date.getFullYear() &&
              aDate.getMonth() === date.getMonth() &&
              aDate.getDate() === date.getDate()
            );
          }).length ?? 0;

        const activeSubscriptions =
          s.subscriptions?.filter((sub) => sub.active).length ?? 0;

        const isLimitReached =
          s.limit &&
          (appointmentsToday >= s.limit || activeSubscriptions >= s.limit);

        return !isLimitReached;
      })
      .sort((a, b) => (a.time && b.time ? a.time.localeCompare(b.time) : 0));
  }
  parseBRDate(value: string): Date | null {
    if (!value) return null;
    const [day, month, year] = value.split('/');
    if (!day || !month || !year) return null;

    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return isNaN(date.getTime()) ? null : date;
  }
  generateNumericPassword(length = 8): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10); // 0 a 9
    }
    return result;
  }
  setTimeOnDate(date: Date, time: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    const newDate = new Date(date); // evitar mutar original
    newDate.setHours(hour, minute, 0, 0);
    return newDate;
  }
  isValidTime(value: string): boolean {
    if (!value) return false;

    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(value.trim());
  }
  isEmail(value: string): boolean {
    if (!value) return false;
    return validator.isEmail(value.trim());
  }
  getFirstName(fullName: string): string {
    return fullName.trim().split(' ')[0];
  }
  isValidCPF(cpf: string): boolean {
    if (!cpf) return false;

    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
    let firstDigit = 11 - (sum % 11);
    if (firstDigit >= 10) firstDigit = 0;
    if (firstDigit !== parseInt(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
    let secondDigit = 11 - (sum % 11);
    if (secondDigit >= 10) secondDigit = 0;
    if (secondDigit !== parseInt(cpf[10])) return false;

    return true;
  }
  async selectEnterpriseStep(
    phone: string,
    existChatByPhoneId: string,
    createChatDto: any,
  ) {
    const findAllEnterprises = await this.prisma.barbershop.findMany({
      where: {
        id: {
          notIn: [
            'da54bab3-b9b0-403a-bf97-1fdc7695190d',
            '41d5f081-9f6f-4d23-9c1d-d38661431432',
          ],
        },
      },
    });
    if (!findAllEnterprises.length) {
      await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: 'Nenhuma empresa para se agendar.',
      });
      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          finished: true,
        },
      });
      return await this.create(createChatDto);
    }
    if (findAllEnterprises.length === 1) {
      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          barbershopId: findAllEnterprises[0]?.id,
        },
      });

      return this.create(createChatDto);
    }
    await whatsApi.post('/send-option-list', {
      phone: phone,
      message: 'Selecione a empresa para se agendar:',
      optionList: {
        title: 'Opções disponíveis',
        buttonLabel: 'Abrir lista de opções',
        options: findAllEnterprises.map((enterprise) => ({
          id: enterprise.id,
          title: enterprise.name,
          description: `Agendar em: ${enterprise.name}`,
        })),
      },
      delayMessage: 5,
    });
  }
  async selectBarberStep(
    phone: string,
    barbershopId: string,
    existChatByPhoneId: string,
    data: any,
  ) {
    const findAllBarbers = await this.prisma.barber.findMany({
      where: {
        barbershopId: barbershopId,
      },
    });
    if (!findAllBarbers.length) {
      await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: 'Nenhum profissional encontrado nesta empresa.',
      });
      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          serviceId: null,
          barberId: null,
          barbershopId: null,
        },
      });
      return await this.create(data);
    }
    if (findAllBarbers.length === 1) {
      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          barberId: findAllBarbers[0]?.id,
        },
      });

      return this.create(data);
    }

    await whatsApi.post('/send-option-list', {
      phone: phone,
      message: 'Selecione o profissional para se agendar:',
      optionList: {
        title: 'Opções disponíveis',
        buttonLabel: 'Abrir lista de opções',
        options: findAllBarbers.map((enterprise) => ({
          id: enterprise.id,
          title: enterprise.name,
          description: `Agendar com: ${enterprise.name}`,
        })),
      },
      delayMessage: 5,
    });
  }
  async selectServiceStep(
    phone: string,
    barbershopId: string,
    existChatByPhoneId: string,
    data: any,
    barbershop: any,
  ) {
    const findAllServices = await this.prisma.service.findMany({
      where: {
        barbershopId: barbershopId,
      },
    });
    if (!findAllServices.length) {
      await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: 'Nenhum serviço encontrado nesta empresa.',
      });

      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          serviceId: null,
          barberId: null,
          barbershopId: null,
        },
      });
      return await this.create(data);
    }

    if (findAllServices.length === 1) {
      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          serviceId: findAllServices[0]?.id,
        },
      });

      return this.create(data);
    }

    await whatsApi.post('/send-option-list', {
      phone: phone,
      message: 'Selecione o serviço para se agendar:',
      optionList: {
        title: 'Opções disponíveis',
        buttonLabel: 'Abrir lista de opções',
        options: findAllServices.map((enterprise) => ({
          id: enterprise.id,
          title: enterprise.name,
          description: `Valor: ${(
            ((enterprise?.amount || 0) / 100) *
            (1 + (barbershop?.fee || 0) / 100)
          ).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          })}`,
        })),
        delayMessage: 5,
      },
    });
  }
  async selectScheduleStep(
    phone: string,
    weeksToSchedule: number,
    barbershopId: string,
    barberId: string,
    existChatByPhoneId: string,
    data: any,
  ) {
    const schedules = await this.scheduleService.findAllByBarbershopId(
      barbershopId,
      barberId,
    );

    if (!schedules.length) {
      await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: 'Nenhuma data disponível para agendamento.',
      });

      await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          serviceId: null,
          barberId: null,
          barbershopId: null,
        },
      });
      return await this.create({
        ...data,
        text: { message: '' },
        listResponseMessage: { title: '' },
      });
    }

    const sanitizedSchedules = schedules
      .filter((s) => s.weekDay !== null)
      .map((s) => ({
        id: s.id,
        weekDay: s.weekDay ?? undefined, // converte null → undefined
      }));

    const dates = this.getAvailableDatesFromSchedules(
      weeksToSchedule,
      sanitizedSchedules,
    );

    await whatsApi.post('/send-option-list', {
      phone: phone,
      message: 'Selecione a data para se agendar:',
      optionList: {
        title: 'Opções disponíveis',
        buttonLabel: 'Abrir lista de opções',
        options: dates.map((enterprise) => {
          const weekDay = enterprise.id.toLocaleDateString('pt-BR', {
            weekday: 'long',
          });
          return {
            id: enterprise.scheduleId,
            title: enterprise.label,
            description: weekDay.charAt(0).toUpperCase() + weekDay.slice(1),
          };
        }),
      },
      delayMessage: 5,
    });
  }
  async selectTimeStep(
    phone: string,
    barbershopId: string,
    barberId: string,
    existChatByPhoneId: string,
    data: any,
    date: string,
  ) {
    const schedules = await this.scheduleService.findAllByBarbershopId(
      barbershopId,
      barberId,
    );
    // const appointments = await this.appointmentService.findByBarberAndDate(
    //   barberId,
    //   date,
    // );

    if (!schedules.length) {
      await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: 'Nenhuma hora disponível para agendamento este dia.',
      });

      return await this.prisma.chat.update({
        where: { id: existChatByPhoneId },
        data: {
          date: null,
          scheduleId: null,
        },
      });
    }
    const sanitizedSchedules = schedules
      .filter((s) => s.time && s.weekDay) // remove entradas inválidas
      .map((s) => ({
        id: s.id,
        time: s.time as string,
        weekDay: s.weekDay as string,
        limit: s.limit as number,
        appointments:
          s.appointments?.map((a) => ({ date: a.date.toISOString() })) ?? [],
        subscriptions:
          s.subscriptions?.map((sub) => ({ active: sub.active })) ?? [],
      }));

    const times = this.getAvailableSchedulesForDate(
      new Date(date ?? Date.now()),
      sanitizedSchedules,
    );
    await whatsApi.post('/send-option-list', {
      phone: phone,
      message: 'Selecione a hora para se agendar:',
      optionList: {
        title: 'Opções disponíveis',
        buttonLabel: 'Abrir lista de opções',
        options: times.map((schedule) => ({
          id: schedule.id,
          title: schedule.time,
        })),
      },
      delayMessage: 5,
    });
  }
  async create(createChatDto) {
    const { phone, senderName } = createChatDto;
    const firstName = this.getFirstName(senderName);
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    const existChatByPhone = await this.prisma.chat.findFirst({
      where: {
        phone: phone,
        finished: false,
        createdAt: {
          gte: twentyMinutesAgo,
        },
      },
      include: { barbershop: true, service: true },
    });
    if (
      existChatByPhone &&
      !existChatByPhone?.finished &&
      createChatDto?.text?.message.toLowerCase() === 'resetar'
    ) {
      await this.prisma.chat.update({
        where: { id: existChatByPhone.id },
        data: {
          finished: true,
          barbershopId: null,
        },
      });
      return await this.create({ ...createChatDto, text: { message: '' } });
    }
    if (
      existChatByPhone &&
      !existChatByPhone?.finished &&
      createChatDto?.buttonsResponseMessage?.buttonId.toLowerCase() ===
        'resetar'
    ) {
      await this.prisma.chat.update({
        where: { id: existChatByPhone.id },
        data: {
          date: null,
          time: null,
          scheduleId: null,
        },
      });
      return await this.create({
        ...createChatDto,
        text: { message: '' },
        buttonsResponseMessage: { buttonId: '' },
      });
    }
    if (!existChatByPhone) {
      await this.prisma.chat.create({
        data: {
          phone: phone,
          name: senderName,
        },
      });
      await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: `Fala ${firstName}! A qualquer momento, se quiser reiniciar todos os dados do agendamento, digite a palavra: *resetar*`,
      });
      return await this.create({ ...createChatDto, text: { message: '' } });
    }
    if (!existChatByPhone.customerId) {
      let cleanedPhone = phone.replace(/\D/g, '');
      if (cleanedPhone.startsWith('55')) {
        cleanedPhone = cleanedPhone.slice(2);
      }
      const findUserByPhone = await this.prisma.customer.findFirst({
        where: { phone: cleanedPhone },
      });
      if (!findUserByPhone) {
        if (!existChatByPhone.email) {
          const emailAnswered = createChatDto?.text?.message;
          if (this.isEmail(emailAnswered)) {
            const existEmail = await this.prisma.customer.findFirst({
              where: { email: emailAnswered.toLowerCase() },
            });
            if (existEmail) {
              return await whatsApi.post('/send-text', {
                phone: phone,
                message: `${firstName}, este email ja esta cadastrado com outro celular em nossa base.\r\nPor favor, informe outro email.`,
                delayMessage: 5,
              });
            }

            await this.prisma.chat.update({
              where: { id: existChatByPhone.id },
              data: {
                email: emailAnswered,
              },
            });

            return await this.create(createChatDto);
          }
          await whatsApi.post('/send-text', {
            phone: phone,
            message: `Fala ${firstName}, para criar seu cadastro, qual o seu e-mail?`,
            delayMessage: 5,
          });
          return;
        }
        if (!existChatByPhone.document) {
          const documentAnswered = createChatDto?.text?.message;
          if (this.isValidCPF(documentAnswered.replace(/\D/g, ''))) {
            const password = this.generateNumericPassword(8);

            const user = await this.customerService.create({
              phone: cleanedPhone,
              name: existChatByPhone.name,
              email: existChatByPhone.email,
              password,
              document: documentAnswered.replace(/\D/g, ''),
            });
            await this.prisma.chat.update({
              where: { id: existChatByPhone.id },
              data: {
                document: documentAnswered.replace(/\D/g, ''),
                customerId: user.id,
              },
            });
            await whatsApi.post('/send-text', {
              phone: phone,
              message: `${firstName}, sua conta foi criada com sucesso!\r\n Agora você pode também se agendar usando o email:\r\n${existChatByPhone.email.toLowerCase()} \r\n a senha:\r\n *_${password}_*\r\nno site: \r\nhttps://horacerta.app\r\n\r\nAgora, vamos continuar com o agendamento aqui mesmo do seu horário!`,
              delayMessage: 5,
            });
            return await this.create(createChatDto);
          }
          await whatsApi.post('/send-text', {
            phone: phone,
            message: `${firstName}, para finalizar seu cadastro, qual o seu cpf?`,
            delayMessage: 5,
          });
          return;
        }
      }
      await this.prisma.chat.update({
        where: { id: existChatByPhone.id },
        data: {
          email: findUserByPhone?.email,
          name: findUserByPhone?.name,
          document: findUserByPhone?.document,
          customerId: findUserByPhone?.id,
        },
      });
      return await this.create(createChatDto);
    }
    if (!existChatByPhone.barbershopId) {
      const barbershopId = createChatDto?.listResponseMessage?.selectedRowId;
      if (barbershopId) {
        const barbershop = await this.prisma.barbershop.findFirst({
          where: { id: barbershopId },
        });
        if (barbershop) {
          await this.prisma.chat.update({
            where: { id: existChatByPhone.id },
            data: {
              barbershopId,
            },
          });

          return await this.create(createChatDto);
        }
      }
      return await this.selectEnterpriseStep(
        phone,
        existChatByPhone?.id,
        createChatDto,
      );
    }
    if (!existChatByPhone.barberId) {
      const barberId = createChatDto?.listResponseMessage?.selectedRowId;
      if (barberId) {
        const barber = await this.prisma.barber.findFirst({
          where: { id: barberId },
        });
        if (barber) {
          await this.prisma.chat.update({
            where: { id: existChatByPhone.id },
            data: {
              barberId,
            },
          });

          return await this.create(createChatDto);
        }
      }
      if (existChatByPhone?.barbershopId) {
        return await this.selectBarberStep(
          phone,
          existChatByPhone?.barbershopId,
          existChatByPhone?.id,
          createChatDto,
        );
      }
    }
    if (!existChatByPhone.serviceId) {
      const serviceId = createChatDto?.listResponseMessage?.selectedRowId;
      if (serviceId) {
        const service = await this.prisma.service.findFirst({
          where: { id: serviceId },
        });

        if (service) {
          await this.prisma.chat.update({
            where: { id: existChatByPhone.id },
            data: {
              serviceId,
            },
          });

          return await this.create(createChatDto);
        }
      }
      if (existChatByPhone?.barbershopId) {
        return await this.selectServiceStep(
          phone,
          existChatByPhone?.barbershopId,
          existChatByPhone?.id,
          createChatDto,
          existChatByPhone?.barbershop,
        );
      }
    }
    if (!existChatByPhone.date) {
      const receivedDate = this.parseBRDate(
        createChatDto?.listResponseMessage?.title,
      );

      const isValidDate = this.isValidDate(receivedDate?.toISOString() ?? '');
      if (isValidDate) {
        const isoDate = receivedDate?.toISOString() ?? null;
        await this.prisma.chat.update({
          where: { id: existChatByPhone.id },
          data: {
            date: isoDate,
          },
        });

        return await this.create(createChatDto);
      }
      if (
        existChatByPhone?.barbershopId &&
        existChatByPhone?.barberId &&
        existChatByPhone?.id
      ) {
        return await this.selectScheduleStep(
          phone,
          existChatByPhone?.barbershop?.weeksToSchedule ?? 2,
          existChatByPhone?.barbershopId,
          existChatByPhone?.barberId,
          existChatByPhone?.id,
          createChatDto,
        );
      }
    }
    if (!existChatByPhone.time) {
      const scheduleId = createChatDto?.listResponseMessage?.selectedRowId;

      const time = createChatDto?.listResponseMessage?.title;
      const isValidScheduleId = await this.isValidScheduleId(scheduleId);
      if (this.isValidTime(time) && isValidScheduleId) {
        await this.prisma.chat.update({
          where: { id: existChatByPhone.id },
          data: {
            scheduleId,
            time,
          },
        });

        return await this.create(createChatDto);
      }
      if (
        existChatByPhone?.barbershopId &&
        existChatByPhone?.barberId &&
        existChatByPhone?.date &&
        createChatDto
      ) {
        return await this.selectTimeStep(
          phone,
          existChatByPhone?.barbershopId,
          existChatByPhone?.barberId,
          existChatByPhone?.id,
          createChatDto,
          existChatByPhone?.date,
        );
      }
    }

    const userBalance = await this.balanceService.findMine({
      customerId: existChatByPhone?.customerId,
      barbershopId: existChatByPhone?.barbershopId!,
    });

    const servicePrice = existChatByPhone?.service?.amount || 0;
    if (userBalance >= servicePrice) {
      try {
        if (
          existChatByPhone?.date &&
          existChatByPhone?.time &&
          existChatByPhone?.serviceId &&
          existChatByPhone?.barberId &&
          existChatByPhone?.barbershopId &&
          existChatByPhone?.scheduleId &&
          existChatByPhone?.customerId
        ) {
          const dateWithTime = this.setTimeOnDate(
            new Date(existChatByPhone?.date),
            existChatByPhone?.time,
          );

          // adiciona 3 horas (em milissegundos)
          dateWithTime.setHours(dateWithTime.getHours() + 3);

          const finalDate = dateWithTime;
          const appointment = await this.appointmentService.create({
            customerId: existChatByPhone?.customerId,
            barbershopId: existChatByPhone?.barbershopId,
            barberId: existChatByPhone?.barberId,
            serviceId: existChatByPhone?.serviceId,
            scheduleId: existChatByPhone?.scheduleId,
            date: finalDate,
          });
          await this.prisma.chat.update({
            where: { id: existChatByPhone.id },
            data: {
              appointmentId: appointment?.id,
              finished: true,
            },
          });
          const barbershopName = existChatByPhone?.barbershop?.name ?? '';
          const serviceName = existChatByPhone?.service?.name ?? '';
          const dateString = new Date(
            existChatByPhone?.date ?? '',
          ).toLocaleDateString('pt-BR');
          const time = existChatByPhone?.time ?? '';

          await whatsApi.post('/send-text', {
            phone,
            delayMessage: 5,
            message: `Agendamento de ${serviceName} realizado com sucesso em ${barbershopName}! Dia ${dateString} às ${time}`,
          });
          return;
        }
      } catch (error) {
        await this.prisma.chat.update({
          where: { id: existChatByPhone.id },
          data: {
            time: null,
          },
        });
        await whatsApi.post('/send-text', {
          phone: phone,
          delayMessage: 5,
          message: `Ocorreu um erro ao tentar agendar o horário, por favor, tente novamente.`,
        });
        return await this.create(createChatDto);
      }
    } else {
      const cartIds = existChatByPhone?.serviceId
        ? [existChatByPhone?.serviceId]
        : [];
      if (existChatByPhone?.barbershopId) {
        const order = await this.ordersService.create({
          customerId: existChatByPhone?.customerId,
          barbershopId: existChatByPhone?.barbershopId,
          cartIds,
          document: existChatByPhone?.document!,
          phone: existChatByPhone?.phone,
          isPix: true,
          installments: '1',
          whatsapp: phone,
          amount: servicePrice,
          status: 'PENDING',
        });
        await this.prisma.chat.update({
          where: { id: existChatByPhone.id },
          data: {
            pix: order?.result?.pix?.qrCode,
          },
        });
        await whatsApi.post('send-button-pix', {
          phone,
          pixKey: order?.result?.pix?.qrCode,
          type: 'EVP',
        });
        return;
      }
      return await whatsApi.post('/send-text', {
        phone: phone,
        delayMessage: 5,
        message: 'Se deseja resetar o agendamento, digite: *resetar*',
      });
    }
  }

  // async findAll() {
  //   return await this.prisma.chat.findMany();
  // }

  // async findOne(id: string) {
  //   return await this.prisma.chat.findFirst({ where: { id } });
  // }

  // async update(id: string, updateChatDto: UpdateChatDto) {
  //   return await this.prisma.chat.update({
  //     where: { id },
  //     data: updateChatDto,
  //   });
  // }

  // async remove(id: string) {
  //   return await this.prisma.chat.delete({ where: { id } });
  // }
}
